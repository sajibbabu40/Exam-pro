require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// ডাটাবেস (আপাতত মেমোরিতে, পরে MongoDB Atlas কানেক্ট হবে)
let exams = {}; 

io.on('connection', (socket) => {
  // ১. পরীক্ষা শুরু
  socket.on('startExam', (data) => {
    const { examId, duration } = data;
    if (!exams[examId]) {
      exams[examId] = { 
        timeLeft: duration * 60, 
        violations: {},
        startTime: Date.now() 
      };
      
      const timer = setInterval(() => {
        if (exams[examId].timeLeft > 0) {
          exams[examId].timeLeft--;
          io.to(examId).emit('timerUpdate', exams[examId].timeLeft);
        } else {
          clearInterval(timer);
          io.to(examId).emit('forceSubmit'); // ৪. অটো সাবমিট
        }
      }, 1000);
    }
    socket.join(examId);
  });

  // ৩. ট্যাব সুইচ রেকর্ড
  socket.on('recordViolation', (data) => {
    const { examId, studentName } = data;
    if (exams[examId]) {
      exams[examId].violations[studentName] = (exams[examId].violations[studentName] || 0) + 1;
      console.log(`Violation: ${studentName} switched tab ${exams[examId].violations[studentName]} times`);
    }
  });
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/exam', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exam.html'));
});

server.listen(process.env.PORT || 3000, () => console.log("Server Live!"));

