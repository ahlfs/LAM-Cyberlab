fetch("http://localhost:3000/api/send-stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "hi",
    model: "tamandata/cx/gpt-5.4-mini",
    provider: "Local (localhost:20128)"
  })
}).then(res => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  function read() {
    reader.read().then(({done, value}) => {
      if (value) console.log(decoder.decode(value));
      if (!done) read();
    })
  }
  read();
});
