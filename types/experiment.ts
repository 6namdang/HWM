export interface Experiment {
  id: number
  name: string
  status: string
  created_at: string
  accuracy: number | null
  loss: number | null
  duration: number | null
  current_epoch?: number
}

export interface ExperimentHistory {
  epoch: number
  train_loss: number
  val_loss: number
  train_acc: number
  val_acc: number
}

export interface ExperimentDetails extends Experiment {
  learning_rate: number
  batch_size: number
  epochs: number
  optimizer: string
  model_type: string
  hidden_layers: number
  neurons_per_layer: number
  history: ExperimentHistory[]
}

