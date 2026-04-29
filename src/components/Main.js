// src/components/Main.js
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import Webcam from "react-webcam";
import LinearWithValueLabel from "./LinearWithValueLabel";
import Button from "@mui/material/Button";
import ClassBar from "./ClassBar";
import "../style/Main.css";
import { Box, Slider } from "@mui/material";
import { CameraAlt, InsertPhoto } from "@mui/icons-material";
import labels from "../utils/labels.json";
import { renderBoxes, Colors } from "../utils/renderBox";

const Main = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
    outputShape: null,
  });

  const canvasRef = useRef(null);
  const webcamRef = useRef(null);
  const inputImageRef = useRef(null);

  const [img, setImg] = useState(null);
  const [dict, setDict] = useState({});
  const [myDict, setMyDict] = useState({});
  const [selectedClassBar, setSelectedClassBar] = useState(null);
  const [settingVisible, setSettingVisible] = useState(false);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);

  const numClass = labels.length;
  const colors = new Colors();
  const modelName = "yolov8n";

  // ---------- 모델 로드 ----------
  useEffect(() => {
    const loadModel = async () => {
      try {
        const currentPath = window.location.href.replace("/main", "");
        const yolov8 = await tf.loadGraphModel(
          currentPath + "/" + modelName + "_web_model/model.json",
          {
            onProgress: (fractions) => {
              setLoading({ loading: true, progress: fractions });
            },
          }
        );

        const dummyInput = tf.randomUniform(
          yolov8.inputs[0].shape,
          0,
          1,
          "float32"
        );
        const warmupResults = yolov8.execute(dummyInput);
        const warmupOutput = Array.isArray(warmupResults)
          ? (warmupResults.find(t => t.shape.length === 3 || t.shape.length === 2) || warmupResults[0])
          : warmupResults;

        setLoading({ loading: false, progress: 1 });
        setModel({
          net: yolov8,
          inputShape: yolov8.inputs[0].shape,
          outputShape: warmupOutput.shape,
        });

        tf.dispose([warmupResults, dummyInput]);
      } catch (error) {
        console.error("모델 로드 중 오류 발생:", error);
        setLoading({ loading: false, progress: 0 });
      }
    };

    if (!model.net) {
      tf.ready().then(loadModel);
    }
  }, [model.net, modelName]);

  // ---------- dict → myDict ----------
  useEffect(() => {
    Object.keys(dict).forEach((key) => {
      const value = dict[key];
      if (!value) return;

      const score100 = parseFloat((value.score * 100).toFixed(1));

      setMyDict((prev) => {
        const prevVal = prev[key];
        if (prevVal && prevVal.score >= score100) return prev;
        return {
          ...prev,
          [key]: {
            score: score100,
            color: value.color,
          },
        };
      });
    });
  }, [dict]);

  // ---------- 이미지 리사이즈 ----------
  const resizeImage = (imageSrc, callback) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgEl = new Image();
    imgEl.onload = () => {
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(imgEl, 0, 0, size, size);
      callback(canvas.toDataURL("image/jpeg"));
    };
    imgEl.src = imageSrc;
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      resizeImage(url, (resizedImage) => {
        handleResetDetection();
        setImg(resizedImage);
        URL.revokeObjectURL(url);
      });
    }
  };

  const handleResetDetection = () => {
    setMyDict({});
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }
  };

  // ---------- 전처리 ----------
  const preprocess = (source, modelWidth, modelHeight) => {
    var xRatio = 1;
    var yRatio = 1;

    const input = tf.tidy(() => {
      const imgTensor = tf.browser.fromPixels(source);
      const shape = imgTensor.shape;
      const h = shape[0];
      const w = shape[1];
      const maxSize = Math.max(w, h);

      if (maxSize > modelWidth || maxSize > modelHeight) {
        throw new Error("Image size exceeds model input size");
      }

      const imgPadded = imgTensor.pad([
        [0, maxSize - h],
        [0, maxSize - w],
        [0, 0],
      ]);

      xRatio = maxSize / w;
      yRatio = maxSize / h;

      return tf.image
        .resizeBilinear(imgPadded, [modelWidth, modelHeight])
        .div(255)
        .expandDims(0); // [1, H, W, 3]
    });

    return [input, xRatio, yRatio];
  };

  // ---------- 탐지 (main 역할) ----------
  const detectFrame = async (source, modelState, canvas) => {
    if (!modelState.net) return;

    const inputShape = modelState.inputShape;
    const modelHeight = inputShape[1];
    const modelWidth = inputShape[2];

    tf.engine().startScope();

    const pre = preprocess(source, modelWidth, modelHeight);
    const input = pre[0];
    const xRatio = pre[1];
    const yRatio = pre[2];

    const res = modelState.net.execute(input);
    const output = Array.isArray(res) 
      ? (res.find(t => t.shape.length === 3 || t.shape.length === 2) || res[0])
      : res;

    const transRes = tf.tidy(() => {
      const squeezed = output.squeeze(); // 크기 1인 차원 제거

      // 2D인 경우 (예: [84, 8400]) -> [8400, 84]
      if (squeezed.shape.length === 2) {
        return squeezed.transpose([1, 0]);
      }

      // 3D인 경우 (예: [C, H, W]) -> [C, H*W] -> [H*W, C]
      if (squeezed.shape.length === 3) {
        const c = squeezed.shape[0];
        const h = squeezed.shape[1];
        const w = squeezed.shape[2];
        const reshaped = squeezed.reshape([c, h * w]);
        return reshaped.transpose([1, 0]);
      }

      return squeezed;
    });

    //  바운딩 박스들 얻기 [y1, x1, y2, x2]
    const boxes = tf.tidy(() => {
      const w = transRes.slice([0, 2], [-1, 1]);
      const h = transRes.slice([0, 3], [-1, 1]);
      const x1 = tf.sub(transRes.slice([0, 0], [-1, 1]), tf.div(w, 2));
      const y1 = tf.sub(transRes.slice([0, 1], [-1, 1]), tf.div(h, 2));
      return tf
        .concat(
          [
            y1,
            x1,
            tf.add(y1, h), // y2
            tf.add(x1, w), // x2
          ],
          1
        ) // [y1, x1, y2, x2]
        .squeeze(); // [n, 4]
    });

    // 점수(신뢰도)와 클래스 명 가져오기
    const scoresAndClasses = tf.tidy(() => {
      const rawScores = transRes
        .slice([0, 4], [-1, numClass])
        .squeeze(); // [n, numClass]
      const scores = rawScores.max(1);
      const classes = rawScores.argMax(1);
      return [scores, classes];
    });
    const scores = scoresAndClasses[0];
    const classes = scoresAndClasses[1];

    const nms = await tf.image.nonMaxSuppressionAsync(
      boxes,
      scores,
      500,
      0.45,
      scoreThreshold
    );

    const detReady = tf.tidy(() =>
      tf.concat(
        [
          boxes.gather(nms, 0),
          scores.gather(nms, 0).expandDims(1),
          classes.gather(nms, 0).expandDims(1),
        ],
        1 // axis
      )
    );

    const toDraw = [];
    const value = {};

    for (let i = 0; i < detReady.shape[0]; i++) {
      const rowData = detReady.slice([i, 0], [1, 6]);
      const data = rowData.dataSync();
      const y1 = data[0];
      const x1 = data[1];
      const y2 = data[2];
      const x2 = data[3];
      const score = data[4];
      const label = data[5];

      const color = colors.get(label);
      const upSampleBox = [
        Math.floor(y1 * yRatio), // y
        Math.floor(x1 * xRatio), // x
        Math.round((y2 - y1) * yRatio), // h
        Math.round((x2 - x1) * xRatio), // w
      ];

      toDraw.push({
        box: upSampleBox,
        score: score,
        class: label,
        label: labels[label],
        color: color,
      });

      if (!value[labels[label]] || value[labels[label]].score < score) {
        value[labels[label]] = { score: score, color: color };
      }

      tf.dispose(rowData);
    }

    setDict(value);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      renderBoxes(ctx, toDraw);
    }

    tf.dispose([
      res,
      output,
      transRes,
      boxes,
      scores,
      classes,
      detReady,
      input,
    ]);
    tf.engine().endScope();
  };

  // ---------- Webcam 캡쳐 ----------
  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    resizeImage(imageSrc, (resized) => setImg(resized));
  }, []);

  const classbar = Object.entries(myDict).map(([key, value]) => (
    <div key={key} style={{ margin: "15px 0" }}>
      <ClassBar
        label={key}
        bgcolor={value.color}
        completed={value.score}
        onClick={setSelectedClassBar}
      />
    </div>
  ));

  const newScoreThreshold = (event, newValue) => {
    if (typeof newValue === "number") {
      setScoreThreshold(newValue);
    }
  };

  const videoConstraints = {
    facingMode: "environment",
  };

  return (
    <div className="Main">
      {loading.loading && (
        <LinearWithValueLabel
          value={parseFloat((loading.progress * 100).toFixed(2))}
        />
      )}

      <div className="header">
        <h1>Capture or Select Image</h1>
      </div>

      <div className="bg-content">
        <div className="content">
          {img === null ? (
            <Webcam
              audio={false}
              mirrored={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
            />
          ) : (
            <>
              <img
                src={img}
                alt="screenshot"
                onLoad={(e) => {
                  const imageElement = new Image();
                  imageElement.src = e.target.src;
                  if (canvasRef.current && model.net) {
                    detectFrame(
                      imageElement,
                      model,
                      canvasRef.current
                    );
                  }
                }}
              />
              <canvas
                width={model.inputShape[1]}
                height={model.inputShape[2]}
                ref={canvasRef}
              />
            </>
          )}
        </div>

        <div className="button-set">
          <Button
            variant="contained"
            color="error"
            style={{
              marginRight: "5px",
              width: "50%",
              wordBreak: "keep-all",
              height: "5rem",
            }}
            onClick={() => {
              if (img === null) {
                capture();
              } else {
                setImg(null);
                handleResetDetection();
              }
            }}
            startIcon={<CameraAlt />}
          >
            Capture
          </Button>

          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
            ref={inputImageRef}
          />
          <Button
            variant="contained"
            style={{ marginRight: "5px", width: "50%", height: "5rem" }}
            size="medium"
            onClick={() => {
              if (inputImageRef.current) inputImageRef.current.click();
            }}
            startIcon={<InsertPhoto />}
          >
            Image Selection
          </Button>
        </div>

        <div className="classbar">{classbar}</div>
      </div>

      {settingVisible && (
        <Box sx={{ width: "75%", maxWidth: 500, alignItems: "center" }}>
          <Slider
            aria-label="ScoreThreshold"
            defaultValue={scoreThreshold}
            valueLabelDisplay="auto"
            step={0.05}
            marks
            min={0.5}
            max={0.95}
            onChange={newScoreThreshold}
          />
          <p
            style={{
              textAlign: "center",
              color: "#000000",
              fontWeight: "bold",
            }}
          >
            ScoreThreshold: {scoreThreshold}
          </p>
        </Box>
      )}
    </div>
  );
};

export default Main;