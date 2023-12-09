import { Sticker } from 'wa-sticker-formatter';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import gif2webp from 'gif2webp-bin';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

async function isGif(url) {
    const response = await axios.head(url);
    return response.headers['content-type'] === 'image/gif';
}

async function convertGifToWebp(gifPath, webpPath) {
    return new Promise((resolve, reject) => {
        const process = spawn(gif2webp, [gifPath, '-o', webpPath]);

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Failed to convert GIF to WebP. Exit code: ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

async function createStickerAndSave(imageUrl, packName, authorName) {
    const type = 'full';
    const getOptions = (pack = '', author = '') => ({
        pack,
        type,
        author: `${author}-${type}`
    });

    try {
        const isGifImage = await isGif(imageUrl);

        let sticker;
        if (isGifImage) {
            console.log('Converting GIF to WebP');
            const gifPath = 'temp.gif';
            const webpPath = 'temp.webp';

            const response = await axios({
              method: 'GET',
              url: imageUrl,
              responseType: 'arraybuffer',
            });
  
            await fs.writeFile(gifPath, Buffer.from(response.data));


            await convertGifToWebp(gifPath, webpPath);

            sticker = new Sticker(webpPath, getOptions(packName, authorName));
        } else {
            sticker = new Sticker(imageUrl, getOptions(packName, authorName));
        }

        const outputPath = path.resolve(sticker.defaultFilename);

        await sticker.toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error('Error creating or saving sticker:', error.message);
    }
}
app.get('/',(req,res)=>{
  res.send('Hello World')
})


app.get('/img',async (req,res) => {
  try{
    //'https://te.legra.ph/file/30d0cec47423d5370ea0c.png';
    const imageUrl = req.query.url;
    const author = req.query.author;
    const pack = req.query.pack;

    // Create the "images" folder if it doesn't exist
    try {
        await fs.mkdir('images');
    } catch (err) {
        if (err.code !== 'EEXIST') {
            console.error('Error creating "images" folder:', err.message);
            process.exit(1);
        }
    }

    // Example usage:
    const fileName = await createStickerAndSave(imageUrl, pack, author);
    const formattedFileName = path.basename(fileName);
    res.json({file:'/'+formattedFileName})
  }catch(error){
    res.json({error:error.message});
  }

})

app.get('/gif',async (req,res) => {
  try{
    //'https://c.tenor.com/2RdLoyV5VPsAAAAC/ayame-nakiri.gif';
    const gifUrl = req.query.url;
    const author = req.query.author;
    const pack = req.query.pack;


    // Create the "images" folder if it doesn't exist
    try {
        await fs.mkdir('images');
    } catch (err) {
        if (err.code !== 'EEXIST') {
            console.error('Error creating "images" folder:', err.message);
            process.exit(1);
        }
    }

    // Example usage:
    // await createStickerAndSave(imageUrl, 'Tofu', 'Miko');
    const fileName = await createStickerAndSave(gifUrl, pack, author);
    const formattedFileName = path.basename(fileName);
    res.json({file:'/'+formattedFileName})
  }catch(error){
    res.json({error:error.message});
  }
})


app.get('/:filename', async (req, res) => {
    const requestedFilename = req.params.filename;
    const filePath = path.resolve(requestedFilename);

    try {
        await fs.access(filePath, fs.constants.F_OK);
        const contentType ='image/webp';

        res.setHeader('Content-Type', contentType);
        res.sendFile(filePath);
    } catch (err) {
        res.status(404).send('File not found');
    }
});




app.listen(port, () => console.log(`Listening on port http://localhost:${port}`));