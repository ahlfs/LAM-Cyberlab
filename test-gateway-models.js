fetch('http://127.0.0.1:8642/v1/models')
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);
