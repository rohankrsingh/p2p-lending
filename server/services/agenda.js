/**
 * Agenda.js scheduler service.
 *
 * Initialises Agenda with the shared MongoDB connection and
 * exposes it so jobs can be registered and the scheduler started.
 */
import Agenda from 'agenda';
import mongoose from 'mongoose';

const agenda = new Agenda({
  db: {
    address: mongoose.connection.client.s.url,
    collection: 'agendaJobs',
  },
  processEvery: '30 seconds',
  defaultConcurrency: 5,
  maxConcurrency: 10,
  defaultLockLifetime: 60000,
});

export default agenda;
