import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import express from "express";
import zl from "zip-lib";
import fs from "fs";
import path from "path";
import { upload } from "./middlewares/multer.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/static", express.static("static"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PORT = process.env.PORT;

const SERVER_URL = `http://localhost:5000/`;

app.post("/create-template", upload.single("file"), async (req, res) => {
  try {
    const { language, framework } = req.body;

    if (!language || !framework) {
      return res.status(400).json({
        statusCode: 400,
        payload: null,
        message: "Required fields missing",
      });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    const zipPath =
      `${language}-${framework}-custom-${uniqueSuffix}`.toLowerCase();

    await zl.extract(req.file.path, "templates/" + zipPath);

    fs.rmSync(req.file.path);

    res.status(200).json({
      statusCode: 200,
      payload: { template_name: zipPath },
      message: "Boilerplate template created successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      statusCode: 500,
      payload: error,
      message: "Failed to create boilerplate template.",
    });
  }
});

app.post("/generate-boilerplate", async (req, res) => {
  try {
    const { language, framework } = req.body;

    if (!language || !framework) {
      return res.status(400).json({
        statusCode: 400,
        payload: null,
        message: "Required fields missing",
      });
    }

    const template_paths = fs.readdirSync("templates/");

    const prompt = `You are an AI assistant who has the following boilerplate folders: ${JSON.stringify(
      template_paths
    )}.
    
    Provided information:
    {
        "language": "${language}",
        "framework": "${framework}"
    }
        
    Choose one among the boilerplate folders and return that path.
    
    NOTE: Don't return anything except the path. No explanation or comments`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const selectedFolder = response.candidates[0].content.parts[0].text.replace(
      "\n",
      ""
    );

    await zl.archiveFolder(
      path.join("templates", selectedFolder),
      path.join("static", `${selectedFolder}.zip`)
    );

    res.status(200).json({
      statusCode: 200,
      payload: { file_path: SERVER_URL + "static/" + `${selectedFolder}.zip` },
      message: "Boilerplate generation successful.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      statusCode: 500,
      payload: error,
      message: "Failed to generate boilerplate",
    });
  }
});

app.post("/generate-template", async (req, res) => {
  try {
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({
        statusCode: 400,
        payload: null,
        message: "Required field: `template` is missing.",
      });
    }

    const existingDirectory = fs.existsSync(path.join("templates", template));

    if (!existingDirectory) {
      return res.status(400).json({
        statusCode: 400,
        payload: null,
        message: "Invalid template provided.",
      });
    }

    const selectedFolder = template;

    await zl.archiveFolder(
      path.join("templates", selectedFolder),
      path.join("static", `${selectedFolder}.zip`)
    );

    res.status(200).json({
      statusCode: 200,
      payload: { file_path: SERVER_URL + "static/" + `${selectedFolder}.zip` },
      message: "Boilerplate generation successful.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      statusCode: 500,
      payload: error,
      message: "Failed to generate boilerplate code.",
    });
  }
});

app.get("/templates", (req, res) => {
  try {
    res.status(200).json({
      statusCode: 200,
      templates: fs.readdirSync("templates/"),
      message: "Templates fetched successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      statusCode: 500,
      payload: error,
      message: "Failed to fetch templates.",
    });
  }
});

app.delete("/template", async (req, res) => {
  try {
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({
        statusCode: 400,
        payload: null,
        message: "Required fields missing",
      });
    }

    fs.rmSync(path.join("templates", template), { recursive: true });

    res.status(200).json({
      statusCode: 200,
      templates: null,
      message: "Template deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      statusCode: 500,
      payload: error,
      message: "Failed to delete template.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
