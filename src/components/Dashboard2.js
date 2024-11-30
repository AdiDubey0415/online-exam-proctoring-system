import React, { useRef, useState, useEffect } from "react";
import swal from "sweetalert";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as posenet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs";
import { Button } from "@material-ui/core";
import Webcam from "react-webcam";
import "./Dashboard2.css";
import { useHistory } from "react-router-dom";

const Dashboard2 = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamRef = useRef(null);
  const history = useHistory();
  let count_facedetect = 0;

  // Timer state
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour = 3600 seconds

  // Load the coco-ssd and posenet models
  const loadModels = async () => {
    // Load coco-ssd model for object detection
    const cocoModel = await cocoSsd.load();
    // Load posenet model for pose detection
    const posenetModel = await posenet.load({
      architecture: "ResNet50",
      quantBytes: 2,
      inputResolution: { width: 640, height: 480 },
      scale: 0.6,
    });

    return { cocoModel, posenetModel };
  };

  useEffect(() => {
    if (timeLeft === 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000); // Decrease the time every second

    return () => clearInterval(timerId); // Cleanup timer
  }, [timeLeft]);

  // Format time in minutes:seconds
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: 500, height: 300 },
        });
        videoRef.current.srcObject = stream;

        const { cocoModel, posenetModel } = await loadModels();
        detectFrame(videoRef.current, cocoModel, posenetModel); // Start detecting frames
      } catch (error) {
        console.error(error);
      }
    };

    setupCamera();
  }, []);

  const detectFrame = (video, cocoModel, posenetModel) => {
    // Detect objects with coco-ssd
    cocoModel.detect(video).then((predictions) => {
      if (canvasRef.current) {
        renderPredictions(predictions);
      }
    });

    // Detect pose with posenet
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      posenetModel.estimateSinglePose(webcamRef.current.video).then((pose) => {
        EarsDetect(pose.keypoints, 0.9); // Detect if ears are hidden or facing away
        // Optionally draw pose keypoints
        // drawCanvas(pose, videoWidth, videoHeight);
      });
    }

    requestAnimationFrame(() => detectFrame(video, cocoModel, posenetModel)); // Continue detecting
  };

  const renderPredictions = (predictions) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";

    let multiple_face = 0;
    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = "#00FFFF";
      ctx.fillRect(
        x,
        y,
        ctx.measureText(prediction.class).width + 8,
        parseInt(font, 10) + 8
      );

      if (prediction.class === "person") {
        multiple_face++;
        if (multiple_face >= 2) {
          swal("Multiple Face Detection", "Action has been Recorded", "error");
        }
      } else if (["cell phone", "book", "laptop"].includes(prediction.class)) {
        swal(
          `${prediction.class} Detected`,
          "Action has been Recorded",
          "error"
        );
        count_facedetect++;
      } else {
        swal("Face Not Visible", "Action has been Recorded", "error");
        count_facedetect++;
      }
    });

    predictions.forEach((prediction) => {
      const [x, y] = prediction.bbox;
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
    });
  };

  const EarsDetect = (keypoints, minConfidence) => {
    const keypointEarR = keypoints[3];
    const keypointEarL = keypoints[4];

    if (keypointEarL.score < minConfidence) {
      // swal("You looked away from the Screen (To the Right)");
      console.log("You looked away from the Screen (To the Right)");
    }
    if (keypointEarR.score < minConfidence) {
      console.log("You looked away from the Screen (To the Right)");
      // swal("You looked away from the Screen (To the Left)");
    }
  };

  return (
    <div className="App-header" id="Dash">
      <div
        style={{
          width: "100vw",
          display: "flex",
          justifyContent: "space-between",
          padding: "2rem",
        }}
      >
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "2rem",
          }}
        >
          <Webcam
            ref={webcamRef}
            style={{
              // position: "absolute",
              // marginLeft: "auto",
              // marginRight: "auto",
              // left: 0,
              // right: 0,
              // textAlign: "center",
              // zindex: 9,
              width: 640,
              height: 480,
            }}
          />
          {/* <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width="500"
            height="300"
          /> */}
          {/* <canvas ref={canvasRef} width="500" height="300" /> */}

          <div>
            <p>Remaining Time: {formatTime(timeLeft)}</p>
          </div>

          <div>
            <center>
              <Button
                variant="contained"
                onClick={() => history.push("/thankyou")}
              >
                Submit
              </Button>
            </center>
          </div>
        </section>

        <section>
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSfgV96b_DjTKUUXn9tWJzIUfyFO0qrFEcmYl35loIkqb9MeJw/viewform?embedded=true"
            width="640"
            height="875"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="Google Form"
          >
            Loading…
          </iframe>
        </section>
      </div>
    </div>
  );
};

export default Dashboard2;
