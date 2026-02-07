// Test script cho Backend API
// Chạy: node test-api.js

const BASE_URL = "http://localhost:5000/api";

async function testAPI() {
  console.log("=== TESTING PERSONAL DIARY API ===\n");

  // 1. Health Check
  console.log("1. Health Check:");
  let res = await fetch(`${BASE_URL}/health`);
  let data = await res.json();
  console.log(`   Status: ${res.status}`, data);
  console.log("");

  // 2. Register User 1
  console.log("2. Register User 1 (testuser1):");
  res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "testuser1",
      email: "test1@example.com",
      password: "password123",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  const user1Token = data.data?.token;
  const user1Id = data.data?._id;
  console.log("");

  // 3. Register User 2
  console.log("3. Register User 2 (testuser2):");
  res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "testuser2",
      email: "test2@example.com",
      password: "password123",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  const user2Token = data.data?.token;
  console.log("");

  // 4. Login User 1
  console.log("4. Login User 1:");
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test1@example.com",
      password: "password123",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  console.log("");

  // 5. Get Me (auth check)
  console.log("5. Get Me (User 1):");
  res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  console.log("");

  // ===== DIARY CRUD =====
  
  // 6. Create Diary (Private)
  console.log("6. Create Diary (Private) - User 1:");
  res = await fetch(`${BASE_URL}/diaries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({
      title: "My Private Diary Entry",
      content: "This is my private diary content. Today was a great day!",
      tags: ["personal", "daily"],
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  const privateDiaryId = data.data?._id;
  console.log("");

  // 7. Create Diary (Public)
  console.log("7. Create Diary (Public) - User 1:");
  res = await fetch(`${BASE_URL}/diaries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({
      title: "My Public Diary Entry",
      content: "This is my public diary. Everyone can read this!",
      isPublic: true,
      tags: ["public", "sharing"],
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  const publicDiaryId = data.data?._id;
  console.log("");

  // 8. Get My Diaries
  console.log("8. Get My Diaries - User 1:");
  res = await fetch(`${BASE_URL}/diaries/my`, {
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, `Found ${data.data?.length} diaries`, JSON.stringify(data.pagination, null, 2));
  console.log("");

  // 9. Update Diary
  console.log("9. Update Diary (Private) - User 1:");
  res = await fetch(`${BASE_URL}/diaries/${privateDiaryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({
      title: "My Updated Private Diary",
      content: "Updated content here!",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  console.log("");

  // 10. Toggle Visibility
  console.log("10. Toggle Visibility (private -> public):");
  res = await fetch(`${BASE_URL}/diaries/${privateDiaryId}/toggle-visibility`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message, `isPublic: ${data.data?.isPublic}`);
  console.log("");

  // 11. Get Public Diaries (Guest)
  console.log("11. Get Public Diaries (no auth - guest):");
  res = await fetch(`${BASE_URL}/diaries/public`);
  data = await res.json();
  console.log(`   Status: ${res.status}`, `Found ${data.data?.length} public diaries`);
  data.data?.forEach((d) => console.log(`   - ${d.title} by ${d.author?.username}`));
  console.log("");

  // 12. Get Single Diary (public - no auth)
  console.log("12. Get Public Diary Detail (no auth):");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}`);
  data = await res.json();
  console.log(`   Status: ${res.status}`, `Title: ${data.data?.title}`);
  console.log("");

  // 13. Try to get private diary without auth (should fail)
  console.log("13. Toggle back to private, then try access without auth:");
  await fetch(`${BASE_URL}/diaries/${privateDiaryId}/toggle-visibility`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  res = await fetch(`${BASE_URL}/diaries/${privateDiaryId}`);
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message);
  console.log("");

  // 14. User 2 tries to update User 1's diary (should fail)
  console.log("14. User 2 tries to update User 1's diary (should 403):");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({ title: "Hacked!" }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message);
  console.log("");

  // ===== COMMENTS =====
  
  // 15. User 2 comments on public diary
  console.log("15. User 2 comments on public diary:");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({
      content: "Great diary entry! Thanks for sharing!",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, JSON.stringify(data, null, 2));
  const commentId = data.data?._id;
  console.log("");

  // 16. User 1 also comments
  console.log("16. User 1 comments on own public diary:");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user1Token}`,
    },
    body: JSON.stringify({
      content: "Thanks for reading!",
    }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`);
  console.log("");

  // 17. Get comments
  console.log("17. Get comments of public diary:");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}/comments`);
  data = await res.json();
  console.log(`   Status: ${res.status}`, `Found ${data.data?.length} comments`);
  data.data?.forEach((c) => console.log(`   - "${c.content}" by ${c.author?.username}`));
  console.log("");

  // 18. Try to comment on private diary (should fail)
  console.log("18. User 2 tries to comment on private diary (should 403):");
  res = await fetch(`${BASE_URL}/diaries/${privateDiaryId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user2Token}`,
    },
    body: JSON.stringify({ content: "Can I comment here?" }),
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message);
  console.log("");

  // 19. User 1 (diary owner) deletes User 2's comment
  console.log("19. User 1 (diary owner) deletes User 2's comment:");
  res = await fetch(`${BASE_URL}/diaries/${publicDiaryId}/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message);
  console.log("");

  // 20. Delete Diary
  console.log("20. Delete private diary - User 1:");
  res = await fetch(`${BASE_URL}/diaries/${privateDiaryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, data.message);
  console.log("");

  // 21. Verify deletion
  console.log("21. Verify - Get My Diaries after deletion:");
  res = await fetch(`${BASE_URL}/diaries/my`, {
    headers: { Authorization: `Bearer ${user1Token}` },
  });
  data = await res.json();
  console.log(`   Status: ${res.status}`, `Found ${data.data?.length} diaries`);
  console.log("");

  console.log("=== ALL TESTS COMPLETED ===");
}

testAPI().catch(console.error);
