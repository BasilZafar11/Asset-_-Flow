import dotenv from 'dotenv';

import app from "./src/server.js";

dotenv.config();

const port = process.env.PORT || 3000;

const startServer = async () => {
    try{
        // await seedModel();
        app.listen(port,()=>{
            console.log(`This app is listening on port: ${port}`);
        })
    }
    catch(err){
        console.log("error: ",error.message);
    }
};

startServer();