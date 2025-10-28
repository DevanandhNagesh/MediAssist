import axios from 'axios';

try {
  const { data } = await axios.post('http://localhost:5000/api/knowledge/search', {
    query: 'dolo 650'
  }, {
    timeout: 20000
  });
  console.log('status ok');
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error('request failed');
  console.error('name:', error.name);
  console.error('message:', error.message);
  if (error.code) console.error('code:', error.code);
  if (error.response) {
    console.error('status', error.response.status);
    console.error('body', error.response.data);
  }
  if (error.cause) console.error('cause:', error.cause);
}
