const express = require('express');
const app = express();
const tf = require("@tensorflow/tfjs-node");
const jimp = require("jimp")
const multer = require("multer")
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const cors = require("cors");
const { nanoid } = require('nanoid');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();


app.use(express.json());
app.use(cors())
app.post('/predict', upload.single("image"), async (req, res, next) => {
    try {
        const model = await tf.loadGraphModel("https://storage.googleapis.com/mlgc-fauzan/model/model.json")
        const image = req.file;
        console.log(image)
        if (image.size > 1000000) {
            res.status(413).json({
                "status": "fail",
                "message": "Payload content length greater than maximum allowed: 1000000"
            })
            return
        }
        const input = tf.node.decodeImage(image.buffer)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims(0);
        const result = model.predict(input)
        const prediction = Array.from(await result.data())[0]
        const r_data_id = nanoid()
        const r_data_result = (prediction > 0.5) ? "Cancer" : "Non-cancer"
        const r_data_suggestion = (prediction > 0.5) ? "Segera periksa ke dokter!" : "Penyakit kanker tidak terdeteksi."
        const r_data_createdAt = new Date().toISOString()
        const data = {
            "id": r_data_id,
            "result": r_data_result,
            "suggestion": r_data_suggestion,
            "createdAt": r_data_createdAt
        }
        const response = {
            "status": "success",
            "message": "Model is predicted successfully",
            data
        }
        console.log(response)
        await db.collection('predictions').doc(data.id).set(data);
        res.status(200).json(response)
    } catch (error) {
        next(error)
    }
});

app.get("/predict/histories", async(req,res,next)=>{
    try {
        const snapshot = await db.collection('predictions').get();
        snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        });
        const data = snapshot.docs.map((doc)=>({"id":doc.id, "history":doc.data()}))
        res.status(200).json({status:"success", data})
    } catch (error) {
        next(error)
    }
})

app.use((err, req, res, next) => {
    console.error(err);
    res.status(400).json({
        "status": "fail",
        "message": "Terjadi kesalahan dalam melakukan prediksi"
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0");
console.log(`Running server at http://localhost:${PORT}`);