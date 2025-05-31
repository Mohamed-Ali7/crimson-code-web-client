export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.status(200).send(`window.API_URL = "${process.env.API_URL || ''}";`);
}