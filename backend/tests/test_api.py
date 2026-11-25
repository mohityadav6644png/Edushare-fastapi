import io
import pytest
from bson import ObjectId
from app.database import get_database

@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "Server running"
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_auth_and_user_flow(client):
    db = get_database()
    await db.users.delete_many({})

    # 1. Register User
    reg_payload = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "password123",
        "confirmPassword": "password123",
        "studentId": "ST1001",
        "semester": "Semester 3"
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert reg_data["data"]["user"]["email"] == "testuser@example.com"
    token = reg_data["data"]["token"]
    assert token is not None

    # Duplicate email register should fail
    dup_res = await client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert dup_res.json()["success"] is False

    # 2. Login User
    login_payload = {
        "email": "testuser@example.com",
        "password": "password123"
    }
    login_res = await client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "token" in login_data["data"]

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Me
    me_res = await client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["user"]["email"] == "testuser@example.com"

    # 4. Update Profile
    update_res = await client.put(
        "/api/auth/profile",
        json={"name": "Updated User", "semester": "Semester 4"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["user"]["name"] == "Updated User"
    assert update_res.json()["data"]["user"]["semester"] == "Semester 4"

    # 5. Logout
    logout_res = await client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

@pytest.mark.asyncio
async def test_material_and_admin_workflow(client):
    db = get_database()
    await db.users.delete_many({})
    await db.materials.delete_many({})
    await db.ratings.delete_many({})

    # Register admin
    admin_reg = await client.post("/api/auth/register", json={
        "name": "Admin Admin",
        "email": "admin@example.com",
        "password": "password123",
        "confirmPassword": "password123",
        "studentId": "AD001",
        "semester": "Faculty"
    })
    admin_token = admin_reg.json()["data"]["token"]
    admin_id = admin_reg.json()["data"]["user"]["id"]
    # Promote to admin directly in db
    await db.users.update_one({"_id": ObjectId(admin_id)}, {"$set": {"role": "admin"}})

    # Register normal student
    student_reg = await client.post("/api/auth/register", json={
        "name": "Student Bob",
        "email": "bob@example.com",
        "password": "password123",
        "confirmPassword": "password123",
        "studentId": "ST2002",
        "semester": "1"
    })
    student_token = student_reg.json()["data"]["token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Upload file as student
    file_content = b"%PDF-1.4 test study material content"
    files = {"file": ("calculus_notes.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {
        "title": "Calculus Notes",
        "subject": "Mathematics",
        "semester": "1"
    }
    upload_res = await client.post("/api/materials/upload", data=data, files=files, headers=student_headers)
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["success"] is True
    material_id = upload_data["data"]["material"]["id"]

    # Student my-uploads shows uploaded material
    my_res = await client.get("/api/materials/my-uploads", headers=student_headers)
    assert my_res.status_code == 200
    assert my_res.json()["count"] == 1

    # Public materials list should NOT show unapproved material
    pub_res = await client.get("/api/materials")
    assert pub_res.status_code == 200
    assert pub_res.json()["count"] == 0

    # Admin pending list shows it
    pending_res = await client.get("/api/admin/materials/pending", headers=admin_headers)
    assert pending_res.status_code == 200
    assert pending_res.json()["count"] == 1

    # Admin approves material
    approve_res = await client.put(f"/api/admin/materials/{material_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["success"] is True

    # Now public materials list shows it
    pub_res2 = await client.get("/api/materials?subject=math")
    assert pub_res2.status_code == 200
    assert pub_res2.json()["count"] == 1
    assert pub_res2.json()["data"][0]["title"] == "Calculus Notes"

    # Rate material as student
    rate_res = await client.post(
        f"/api/materials/{material_id}/rate",
        json={"rating": 5, "comment": "Excellent notes!"},
        headers=student_headers
    )
    assert rate_res.status_code == 200
    assert rate_res.json()["success"] is True

    # Get ratings
    ratings_res = await client.get(f"/api/materials/{material_id}/ratings")
    assert ratings_res.status_code == 200
    assert ratings_res.json()["total"] == 1
    assert ratings_res.json()["data"][0]["rating"] == 5

    # Download material
    download_res = await client.get(f"/api/materials/{material_id}/download")
    assert download_res.status_code == 200
    assert download_res.content == file_content

    # Check stats endpoint
    stats_res = await client.get("/api/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()["data"]
    assert stats["overview"]["totalMaterials"] == 1
    assert stats["overview"]["approvedMaterials"] == 1
    assert stats["overview"]["totalRatings"] == 1

    # Toggle user block
    student_id = student_reg.json()["data"]["user"]["id"]
    toggle_res = await client.put(f"/api/admin/toggle/{student_id}", headers=admin_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["data"]["blocked"] is True

    # Blocked user login should fail
    blocked_login = await client.post("/api/auth/login", json={"email": "bob@example.com", "password": "password123"})
    assert blocked_login.status_code == 403
