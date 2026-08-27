async function test() {
  try {
    const res = await fetch('http://127.0.0.1:8900/proxy/http/localhost:3035/v1/models');
    console.log(res.status);
    const json = await res.json();
    console.log(json.data ? json.data.length : json.models ? json.models.length : 0);
  } catch(e) { console.log("ERROR", e.message); }
}
test();
