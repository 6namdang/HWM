from flask import Flask, request, jsonify
import sqlite3
import json
import os
import time
import threading
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

app = Flask(__name__, static_folder='../out', static_url_path='/')

# Database setup
DB_PATH = 'mnist_experiments.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accuracy REAL,
        loss REAL,
        duration REAL,
        current_epoch INTEGER DEFAULT 0
    )
    ''')
    
    conn.execute('''
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
    ''')
    
    conn.commit()
    conn.close()

# Model definitions
class SimpleModel(nn.Module):
    def __init__(self, hidden_layers=2, neurons_per_layer=128):
        super(SimpleModel, self).__init__()
        self.flatten = nn.Flatten()
        
        layers = []
        input_size = 28 * 28
        
        for i in range(hidden_layers):
            layers.append(nn.Linear(input_size, neurons_per_layer))
            layers.append(nn.ReLU())
            input_size = neurons_per_layer
        
        layers.append(nn.Linear(input_size, 10))
        
        self.layers = nn.Sequential(*layers)
    
    def forward(self, x):
        x = self.flatten(x)
        x = self.layers(x)
        return F.log_softmax(x, dim=1)

class ComplexModel(nn.Module):
    def __init__(self, hidden_layers=2, neurons_per_layer=128):
        super(ComplexModel, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.dropout1 = nn.Dropout(0.25)
        self.dropout2 = nn.Dropout(0.5)
        
        # Calculate size after convolutions and pooling
        self.fc_input_size = 9216
        
        layers = []
        input_size = self.fc_input_size
        
        for i in range(hidden_layers):
            layers.append(nn.Linear(input_size, neurons_per_layer))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.5))
            input_size = neurons_per_layer
        
        layers.append(nn.Linear(input_size, 10))
        
        self.fc_layers = nn.Sequential(*layers)
    
    def forward(self, x):
        x = self.conv1(x)
        x = F.relu(x)
        x = self.conv2(x)
        x = F.relu(x)
        x = F.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = torch.flatten(x, 1)
        x = self.fc_layers(x)
        return F.log_softmax(x, dim=1)

# Training functions
def train(model, device, train_loader, optimizer, epoch, experiment_id):
    model.train()
    train_loss = 0
    correct = 0
    total = 0
    
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = F.nll_loss(output, target)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        pred = output.argmax(dim=1, keepdim=True)
        correct += pred.eq(target.view_as(pred)).sum().item()
        total += len(data)
    
    train_loss /= len(train_loader)
    train_acc = correct / total
    
    # Update current epoch in database
    conn = get_db_connection()
    conn.execute('UPDATE experiments SET current_epoch = ? WHERE id = ?', (epoch, experiment_id))
    conn.commit()
    conn.close()
    
    return train_loss, train_acc

def test(model, device, test_loader):
    model.eval()
    test_loss = 0
    correct = 0
    
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += F.nll_loss(output, target, reduction='sum').item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
    
    test_loss /= len(test_loader.dataset)
    test_acc = correct / len(test_loader.dataset)
    
    return test_loss, test_acc

def run_experiment(experiment_id):
    conn = get_db_connection()
    experiment = conn.execute('SELECT * FROM experiments WHERE id = ?', (experiment_id,)).fetchone()
    conn.close()
    
    if not experiment:
        return
    
    # Update status to running
    conn = get_db_connection()
    conn.execute('UPDATE experiments SET status = ? WHERE id = ?', ('running', experiment_id))
    conn.commit()
    conn.close()
    
    # Clear any existing history
    conn = get_db_connection()
    conn.execute('DELETE FROM experiment_history WHERE experiment_id = ?', (experiment_id,))
    conn.commit()
    conn.close()
    
    # Set device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    test_dataset = datasets.MNIST('./data', train=False, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=experiment['batch_size'], shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=1000, shuffle=False)
    
    # Create model
    if experiment['model_type'] == 'simple':
        model = SimpleModel(experiment['hidden_layers'], experiment['neurons_per_layer']).to(device)
    else:
        model = ComplexModel(experiment['hidden_layers'], experiment['neurons_per_layer']).to(device)
    
    # Set optimizer
    if experiment['optimizer'] == 'sgd':
        optimizer = optim.SGD(model.parameters(), lr=experiment['learning_rate'])
    elif experiment['optimizer'] == 'adam':
        optimizer = optim.Adam(model.parameters(), lr=experiment['learning_rate'])
    else:  # adadelta
        optimizer = optim.Adadelta(model.parameters(), lr=experiment['learning_rate'])
    
    # Train and evaluate
    start_time = time.time()
    
    try:
        for epoch in range(1, experiment['epochs'] + 1):
            train_loss, train_acc = train(model, device, train_loader, optimizer, epoch, experiment_id)
            val_loss, val_acc = test(model, device, test_loader)
            
            # Save history
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO experiment_history (experiment_id, epoch, train_loss, val_loss, train_acc, val_acc)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (experiment_id, epoch, train_loss, val_loss, train_acc, val_acc))
            conn.commit()
            conn.close()
    
        # Calculate duration
        duration = time.time() - start_time
        
        # Update experiment with results
        conn = get_db_connection()
        conn.execute('''
            UPDATE experiments
            SET status = ?, accuracy = ?, loss = ?, duration = ?
            WHERE id = ?
        ''', ('completed', val_acc, val_loss, duration, experiment_id))
        conn.commit()
        conn.close()
    
    except Exception as e:
        print(f"Error running experiment {experiment_id}: {e}")
        
        # Update experiment status to failed
        conn = get_db_connection()
        conn.execute('UPDATE experiments SET status = ? WHERE id = ?', ('failed', experiment_id))
        conn.commit()
        conn.close()

# API routes
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/experiments', methods=['GET'])
def get_experiments():
    sort_field = request.args.get('sort', 'created_at')
    sort_order = request.args.get('order', 'desc')
    
    # Validate sort field to prevent SQL injection
    valid_sort_fields = ['created_at', 'accuracy', 'loss', 'duration', 'name']
    if sort_field not in valid_sort_fields:
        sort_field = 'created_at'
    
    # Validate sort order
    if sort_order not in ['asc', 'desc']:
        sort_order = 'desc'
    
    conn = get_db_connection()
    experiments = conn.execute(f'''
        SELECT id, name, status, created_at, accuracy, loss, duration, current_epoch
        FROM experiments
        ORDER BY {sort_field} {sort_order}
    ''').fetchall()
    conn.close()
    
    return jsonify([dict(exp) for exp in experiments])

@app.route('/api/experiments/<int:id>', methods=['GET'])
def get_experiment_details(id):
    conn = get_db_connection()
    experiment = conn.execute('SELECT * FROM experiments WHERE id = ?', (id,)).fetchone()
    
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    
    history = conn.execute('''
        SELECT epoch, train_loss, val_loss, train_acc, val_acc
        FROM experiment_history
        WHERE experiment_id = ?
        ORDER BY epoch
    ''', (id,)).fetchall()
    
    conn.close()
    
    result = dict(experiment)
    result['history'] = [dict(h) for h in history]
    
    return jsonify(result)

@app.route('/api/experiments', methods=['POST'])
def create_experiment():
    data = request.json
    
    # Validate required fields
    required_fields = ['name', 'learning_rate', 'batch_size', 'epochs', 'optimizer', 
                      'model_type', 'hidden_layers', 'neurons_per_layer']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Check if experiment with same config already exists
    conn = get_db_connection()
    existing = conn.execute('''
        SELECT id FROM experiments
        WHERE learning_rate = ?
        AND batch_size = ?
        AND epochs = ?
        AND optimizer = ?
        AND model_type = ?
        AND hidden_layers = ?
        AND neurons_per_layer = ?
    ''', (
        data['learning_rate'],
        data['batch_size'],
        data['epochs'],
        data['optimizer'],
        data['model_type'],
        data['hidden_layers'],
        data['neurons_per_layer']
    )).fetchone()
    
    if existing:
        conn.close()
        return jsonify({
            'error': 'Similar experiment already exists',
            'existingId': existing['id']
        }), 409
    
    # Create new experiment
    cursor = conn.execute('''
        INSERT INTO experiments (
            name, learning_rate, batch_size, epochs, optimizer, 
            model_type, hidden_layers, neurons_per_layer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['learning_rate'],
        data['batch_size'],
        data['epochs'],
        data['optimizer'],
        data['model_type'],
        data['hidden_layers'],
        data['neurons_per_layer']
    ))
    
    experiment_id = cursor.lastrowid
    conn.commit()
    
    # Get the created experiment
    experiment = conn.execute('SELECT * FROM experiments WHERE id = ?', (experiment_id,)).fetchone()
    conn.close()
    
    # Queue the experiment for execution
    threading.Thread(target=run_experiment, args=(experiment_id,)).start()
    
    return jsonify(dict(experiment)), 201

@app.route('/api/experiments/<int:id>', methods=['DELETE'])
def delete_experiment(id):
    conn = get_db_connection()
    
    # Check if experiment exists
    experiment = conn.execute('SELECT status FROM experiments WHERE id = ?', (id,)).fetchone()
    
    if not experiment:
        conn.close()
        return jsonify({'error': 'Experiment not found'}), 404
    
    # Check if experiment is running
    if experiment['status'] == 'running':
        conn.close()
        return jsonify({'error': 'Cannot delete a running experiment'}), 400
    
    # Delete experiment
    conn.execute('DELETE FROM experiment_history WHERE experiment_id = ?', (id,))
    conn.execute('DELETE FROM experiments WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/experiments/<int:id>/run', methods=['POST'])
def run_experiment_api(id):
    conn = get_db_connection()
    
    # Check if experiment exists
    experiment = conn.execute('SELECT status FROM experiments WHERE id = ?', (id,)).fetchone()
    
    if not experiment:
        conn.close()
        return jsonify({'error': 'Experiment not found'}), 404
    
    # Check if experiment is already running
    if experiment['status'] in ['running', 'queued']:
        conn.close()
        return jsonify({'error': 'Experiment is already running or queued'}), 400
    
    conn.close()
    
    # Queue the experiment for execution
    threading.Thread(target=run_experiment, args=(id,)).start()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)

