/**
 * Agenda.js scheduler service.
 *
 * Initialises Agenda with the shared MongoDB connection and
 * exposes it so jobs can be registered and the scheduler started.
 */
import Agenda from 'agenda';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/p2p';

const agenda = new Agenda({
  db: {
    address: MONGO_URI,
    collection: 'agendaJobs',
  },
  processEvery: '30 seconds',
  defaultConcurrency: 5,
  maxConcurrency: 10,
  defaultLockLifetime: 60000,
});

export default agenda;
