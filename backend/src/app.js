const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');

const healthRouter = require('./routes/health');
const taskRouter = require('./routes/tasks');
const residentRouter = require('./routes/residents');
const absenceRouter = require('./routes/absences');
const wasteDateRouter = require('./routes/wasteDates');
const taskTypeRouter = require('./routes/taskTypes');
const weeklyAssignmentRouter = require('./routes/weeklyAssignments');
const calendarRouter = require('./routes/calendar');

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use('/api/health', healthRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/residents', residentRouter);
app.use('/api/absences', absenceRouter);
app.use('/api/waste-dates', wasteDateRouter);
app.use('/api/task-types', taskTypeRouter);
app.use('/api/weekly-assignments', weeklyAssignmentRouter);
app.use('/api/calendar', calendarRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API-Endpunkt nicht gefunden' });
});

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[backend] Unbehandelter Fehler:', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

module.exports = app;

