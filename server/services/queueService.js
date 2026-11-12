const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.processing = false;
    this.queue = [];
  }

  // Create and enqueue a job
  createJob({ type, payload }) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job = {
      id: jobId,
      type,
      payload,
      status: 'queued',
      progress: 0,
      stage: 'Initiating Task',
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    this.emit('job:created', job);
    this.processNext();
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  updateProgress(jobId, { progress, stage, data = null }) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = progress;
    if (stage) job.stage = stage;
    job.updatedAt = new Date().toISOString();
    this.emit('job:progress', { jobId, progress, stage, data });
  }

  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.stage = 'Completed Successfully';
    job.result = result;
    job.updatedAt = new Date().toISOString();
    this.emit('job:completed', job);
  }

  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error.message || String(error);
    job.stage = 'Failed';
    job.updatedAt = new Date().toISOString();
    this.emit('job:failed', job);
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);

    if (job) {
      job.status = 'processing';
      job.updatedAt = new Date().toISOString();
      this.emit('job:start', job);
    }

    this.processing = false;
    if (this.queue.length > 0) {
      setTimeout(() => this.processNext(), 10);
    }
  }
}

module.exports = new JobQueue();
