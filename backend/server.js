const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/clips', express.static(path.join(__dirname, 'clips')));

const storage = multer.diskStorage({
  destination: './backend/uploads',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.post('/upload', upload.single('video'), (req, res) => {
  const { durations } = req.body;
  const inputPath = req.file.path;
  const clipFolder = path.join(__dirname, 'clips');

  if (!fs.existsSync(clipFolder)) fs.mkdirSync(clipFolder);

  const parsedDurations = durations.split(',').map(d => parseFloat(d.trim()));
  const clipNames = [];
  let startTime = 0;
  let count = 1;

  const processNext = () => {
    if (parsedDurations.length === 0) {
      return res.json({ clips: clipNames });
    }

    const duration = parsedDurations.shift();
    const outputName = `clip_${count}.mp4`;
    const outputPath = path.join(clipFolder, outputName);

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => {
        clipNames.push(`/clips/${outputName}`);
        startTime += duration;
        count++;
        processNext();
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        return res.status(500).send('Error cutting video');
      })
      .run();
  };

  processNext();
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
