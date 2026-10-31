import 'dotenv/config';
import {config} from 'dotenv';
config({path:'.env.local'});
import app from './app.js';
const port=Number(process.env.PORT||3001);
app.listen(port,()=>console.log(`ROAM API listening on http://localhost:${port}`));
