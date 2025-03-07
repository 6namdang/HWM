import sqlite3 from "sqlite3"
import { open } from "sqlite"
import type { ExperimentDetails, Experiment } from "@/types/experiment"

// Initialize database
let dbPromise: any = null

async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: "./mnist_experiments.db",
      driver: sqlite3.Database,
    }).then(async (db) => {
      // Create tables if they don't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS experiments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          learning_rate REAL NOT NULL,
          batch_size INTEGER NOT NULL,
          epochs INTEGER NOT NULL,
          optimizer TEXT NOT NULL,
          model_type TEXT NOT NULL,
          hidden_layers INTEGER NOT NULL,
          neurons_per_layer INTEGER NOT NULL,
          status TEXT DEFAULT 'not_started',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          accuracy REAL,
          loss REAL,
          duration REAL,
          current_epoch INTEGER DEFAULT 0
        )
      `)

      await db.exec(`
        CREATE TABLE IF NOT EXISTS experiment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          experiment_id INTEGER NOT NULL,
          epoch INTEGER NOT NULL,
          train_loss REAL NOT NULL,
          val_loss REAL NOT NULL,
          train_acc REAL NOT NULL,
          val_acc REAL NOT NULL,
          FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE
        )
      `)

      return db
    })
  }

  return dbPromise
}

// Database operations
export const db = {
  async getExperiments(sortField = "created_at", sortOrder = "desc"): Promise<Experiment[]> {
    const db = await getDb()

    // Validate sort field to prevent SQL injection
    const validSortFields = ["created_at", "accuracy", "loss", "duration", "name"]
    if (!validSortFields.includes(sortField)) {
      sortField = "created_at"
    }

    // Validate sort order
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      sortOrder = "desc"
    }

    return db.all(`
      SELECT id, name, status, created_at, accuracy, loss, duration, current_epoch
      FROM experiments
      ORDER BY ${sortField} ${sortOrder}
    `)
  },

  async getExperimentDetails(id: number): Promise<ExperimentDetails | null> {
    const db = await getDb()

    const experiment = await db.get(
      `
      SELECT * FROM experiments WHERE id = ?
    `,
      id,
    )

    if (!experiment) {
      return null
    }

    const history = await db.all(
      `
      SELECT epoch, train_loss, val_loss, train_acc, val_acc
      FROM experiment_history
      WHERE experiment_id = ?
      ORDER BY epoch
    `,
      id,
    )

    return {
      ...experiment,
      history,
    }
  },

  async createExperiment(data: any): Promise<Experiment> {
    const db = await getDb()

    const result = await db.run(
      `
      INSERT INTO experiments (
        name, learning_rate, batch_size, epochs, optimizer, 
        model_type, hidden_layers, neurons_per_layer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.name,
        data.learning_rate,
        data.batch_size,
        data.epochs,
        data.optimizer,
        data.model_type,
        data.hidden_layers,
        data.neurons_per_layer,
      ],
    )

    return this.getExperimentDetails(result.lastID)
  },

  async deleteExperiment(id: number): Promise<void> {
    const db = await getDb()

    await db.run("DELETE FROM experiment_history WHERE experiment_id = ?", id)
    await db.run("DELETE FROM experiments WHERE id = ?", id)
  },

  async findSimilarExperiment(data: any): Promise<Experiment | null> {
    const db = await getDb()

    return db.get(
      `
      SELECT id FROM experiments
      WHERE learning_rate = ?
      AND batch_size = ?
      AND epochs = ?
      AND optimizer = ?
      AND model_type = ?
      AND hidden_layers = ?
      AND neurons_per_layer = ?
    `,
      [
        data.learning_rate,
        data.batch_size,
        data.epochs,
        data.optimizer,
        data.model_type,
        data.hidden_layers,
        data.neurons_per_layer,
      ],
    )
  },

  async queueExperiment(id: number): Promise<void> {
    const db = await getDb()

    // Update experiment status to queued
    await db.run("UPDATE experiments SET status = ?, current_epoch = 0 WHERE id = ?", ["queued", id])

    // Clear any existing history
    await db.run("DELETE FROM experiment_history WHERE experiment_id = ?", id)

    // In a real application, you would send this to a job queue
    // For this demo, we'll simulate the training process
    setTimeout(() => this.runExperiment(id), 1000)
  },

  async runExperiment(id: number): Promise<void> {
    const db = await getDb()

    // Get experiment details
    const experiment = await this.getExperimentDetails(id)
    if (!experiment) return

    // Update status to running
    await db.run("UPDATE experiments SET status = ? WHERE id = ?", ["running", id])

    // Simulate training process
    const startTime = Date.now()

    try {
      // Simulate epochs
      for (let epoch = 1; epoch <= experiment.epochs; epoch++) {
        // Update current epoch
        await db.run("UPDATE experiments SET current_epoch = ? WHERE id = ?", [epoch, id])

        // Simulate training for this epoch
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Generate some fake metrics
        const trainLoss = 0.5 * Math.exp(-0.1 * epoch) + 0.1 * Math.random()
        const valLoss = 0.6 * Math.exp(-0.1 * epoch) + 0.15 * Math.random()
        const trainAcc = 0.9 - 0.5 * Math.exp(-0.2 * epoch) + 0.05 * Math.random()
        const valAcc = 0.85 - 0.5 * Math.exp(-0.2 * epoch) + 0.05 * Math.random()

        // Save history
        await db.run(
          `
          INSERT INTO experiment_history (
            experiment_id, epoch, train_loss, val_loss, train_acc, val_acc
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
          [id, epoch, trainLoss, valLoss, trainAcc, valAcc],
        )
      }

      // Calculate duration
      const duration = (Date.now() - startTime) / 1000

      // Get the final metrics from the last epoch
      const lastEpoch = await db.get(
        `
        SELECT train_loss, val_loss, train_acc, val_acc
        FROM experiment_history
        WHERE experiment_id = ?
        ORDER BY epoch DESC
        LIMIT 1
      `,
        id,
      )

      // Update experiment with results
      await db.run(
        `
        UPDATE experiments
        SET status = ?, accuracy = ?, loss = ?, duration = ?
        WHERE id = ?
      `,
        ["completed", lastEpoch.val_acc, lastEpoch.val_loss, duration, id],
      )
    } catch (error) {
      console.error("Error running experiment:", error)

      // Update experiment status to failed
      await db.run("UPDATE experiments SET status = ? WHERE id = ?", ["failed", id])
    }
  },
}

