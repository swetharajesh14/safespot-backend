import fetch from "node-fetch";

export async function sendFast2SMS({ numbers, message }) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("FAST2SMS_API_KEY missing");

  const nums = Array.isArray(numbers) ? numbers : [numbers];
  const cleaned = nums
    .map((n) => String(n).replace(/\D/g, "")) // digits only
    .map((n) => (n.startsWith("91") ? n : `91${n}`)); // ensure India code

  const body = {
    route: "q", // quick transactional
    message,
    numbers: cleaned.join(","),
  };

  const resp = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok || data?.return === false) {
    throw new Error(`Fast2SMS failed: ${JSON.stringify(data)}`);
  }
  return data;
}