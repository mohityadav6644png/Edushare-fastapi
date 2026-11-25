import io
import pytest
from bson import ObjectId
from app.database import get_database

@pytest.mark.asyncio
async def test_admin_and_alias_routes(client):
    db = get_database()
    await db.users.delete_many({})
    await db.materials.delete_many({})
    await db.ratings.delete_many({})

    # 1. Create admin and normal user
    admin_reg = await client.post("/api/auth/register", json={
        "name": "Super Admin",
        "email": "superadmin@example.com",
        "password": "password123",
        "confirmPassword": "password123",
        "studentId": "AD999",
        "semester": "Admin"
    })
    admin_data = admin_reg.json()["data"]
    admin_token = admin_data["token"]
    admin_id = admin_data["user"]["id"]
    await db.users.update_one({"_id": ObjectId(admin_id)}, {"$set": {"role": "admin"}})

    user_reg = await client.post("/api/auth/register", json={
        "name": "Regular User",
        "email": "regular@example.com",
        "password": "password123",
        "confirmPassword": "password123",
        "studentId": "REG101",
        "semester": "Semester 2"
    })
    user_data = user_reg.json()["data"]
    user_token = user_data["token"]
    user_id = user_data["user"]["id"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 2. Non-admin forbidden from admin routes
    forbidden_res = await client.get("/api/admin/users", headers=user_headers)
    assert forbidden_res.status_code == 403

    # 3. Admin gets user list
    users_res = await client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    assert users_res.json()["total"] == 2

    # 4. Admin cannot change own role
    self_role_res = await client.put(f"/api/admin/users/{admin_id}/role", json={"role": "user"}, headers=admin_headers)
    assert self_role_res.status_code == 400
    assert "cannot change your own role" in self_role_res.json()["message"]

    # 5. Admin updates regular user role
    role_res = await client.put(f"/api/admin/users/{user_id}/role", json={"role": "admin"}, headers=admin_headers)
    assert role_res.status_code == 200
    assert role_res.json()["data"]["role"] == "admin"

    # Reset role back to user
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": "user"}})

    # 6. Upload material as regular user
    files = {"file": ("physics.pdf", io.BytesIO(b"%PDF dummy physics"), "application/pdf")}
    upload_res = await client.post(
        "/api/materials/upload",
        data={"title": "Physics 101", "subject": "Physics", "semester": "Semester 2"},
        files=files,
        headers=user_headers
    )
    assert upload_res.status_code == 201
    mat_id = upload_res.json()["data"]["material"]["id"]

    # 7. Approve via alias route /api/admin/approve/:id
    alias_approve_res = await client.put(f"/api/admin/approve/{mat_id}", headers=admin_headers)
    assert alias_approve_res.status_code == 200
    assert alias_approve_res.json()["success"] is True

    # 8. Check uploads via /api/admin/uploads
    uploads_res = await client.get("/api/admin/uploads?status=approved", headers=admin_headers)
    assert uploads_res.status_code == 200
    assert uploads_res.json()["total"] == 1

    # 9. Ratings validation (rating out of bounds)
    bad_rate = await client.post(
        f"/api/materials/{mat_id}/rate",
        json={"rating": 10, "comment": "Too high"},
        headers=user_headers
    )
    assert bad_rate.status_code == 400

    # Valid rating
    good_rate = await client.post(
        f"/api/materials/{mat_id}/rate",
        json={"rating": 4, "comment": "Very clear"},
        headers=user_headers
    )
    assert good_rate.status_code == 200

    # Check my rating
    my_rating = await client.get(f"/api/materials/{mat_id}/ratings/my-rating", headers=user_headers)
    assert my_rating.status_code == 200
    assert my_rating.json()["data"]["rating"] == 4

    # 10. Material update by owner
    update_mat_res = await client.put(
        f"/api/materials/{mat_id}",
        json={"title": "Physics 101 - Revised"},
        headers=user_headers
    )
    assert update_mat_res.status_code == 200
    assert update_mat_res.json()["data"]["title"] == "Physics 101 - Revised"

    # 11. Delete material via alias /api/admin/delete/:id
    del_alias_res = await client.delete(f"/api/admin/delete/{mat_id}", headers=admin_headers)
    assert del_alias_res.status_code == 200
    assert del_alias_res.json()["success"] is True

    # Confirm it's gone
    get_res = await client.get(f"/api/materials/{mat_id}")
    assert get_res.status_code == 404

    # 12. Check docs alias redirect
    docs_res = await client.get("/api-docs", follow_redirects=False)
    assert docs_res.status_code in (307, 308, 302, 301)
    assert docs_res.headers["location"] == "/docs"
