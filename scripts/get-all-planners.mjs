import fs from 'fs';
import path from 'path';

// Đọc file .env.local thủ công để không cần cài thêm thư viện dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const tenantId = process.env.MS_TENANT_ID;
const clientId = process.env.MS_CLIENT_ID;
const clientSecret = process.env.MS_CLIENT_SECRET;

if (!tenantId || !clientId || !clientSecret) {
  console.error("❌ Lỗi: Bạn chưa điền đủ MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET trong file .env.local");
  process.exit(1);
}

async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: body,
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("❌ Lỗi khi lấy Access Token:", JSON.stringify(errorData, null, 2));
    process.exit(1);
  }

  const data = await response.json();
  return data.access_token;
}

async function getAllPlanners() {
  console.log("⏳ Đang lấy Access Token...");
  const token = await getAccessToken();
  console.log("✅ Lấy Token thành công!");

  console.log("\n⏳ Đang quét danh sách tất cả các Group trong công ty...");
  
  // 1. Lấy danh sách tất cả các Microsoft 365 Groups
  const groupsUrl = 'https://graph.microsoft.com/v1.0/groups?$select=id,displayName&$filter=groupTypes/any(c:c+eq+\'Unified\')';
  const groupsRes = await fetch(groupsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!groupsRes.ok) {
    const err = await groupsRes.json();
    console.error("❌ Lỗi khi lấy danh sách Groups:", err);
    return;
  }

  const groupsData = await groupsRes.json();
  const groups = groupsData.value;
  console.log(`✅ Tìm thấy ${groups.length} nhóm (Microsoft 365 Groups). Bắt đầu tìm kiếm bảng Planner trong từng nhóm...\n`);

  let totalPlans = 0;

  // 2. Lặp qua từng Group để lấy Plan của nó
  for (const group of groups) {
    const plansUrl = `https://graph.microsoft.com/v1.0/groups/${group.id}/planner/plans`;
    
    const plansRes = await fetch(plansUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (plansRes.ok) {
      const plansData = await plansRes.json();
      const plans = plansData.value;
      
      if (plans && plans.length > 0) {
        console.log(`🏢 Nhóm: \x1b[36m${group.displayName}\x1b[0m (Group ID: ${group.id})`);
        
        for (const plan of plans) {
          totalPlans++;
          console.log(`   👉 \x1b[32mPlan Name: ${plan.title}\x1b[0m (Plan ID: ${plan.id})`);
        }
        console.log('--------------------------------------------------');
      }
    } else {
      // Một số nhóm không có Planner hoặc không được quyền truy cập sẽ bị lỗi 403/404, ta cứ bỏ qua
    }
  }

  console.log(`\n🎉 Hoàn tất! Tổng cộng tìm thấy \x1b[33m${totalPlans}\x1b[0m bảng Planner trong toàn công ty.`);
  if (totalPlans > 0) {
    console.log("💡 Bạn có thể copy bất kỳ (Plan ID) hoặc (Group ID) ở trên để dán vào file .env.local và sử dụng.");
  }
}

getAllPlanners().catch(console.error);
