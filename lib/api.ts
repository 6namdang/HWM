// API client for interacting with the backend

export async function createExperiment(data: any) {
  const response = await fetch("/api/experiments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error("Failed to create experiment")
  }

  return response.json()
}

export async function getExperiments(sortField = "created_at", sortOrder = "desc") {
  const response = await fetch(`/api/experiments?sort=${sortField}&order=${sortOrder}`)

  if (!response.ok) {
    throw new Error("Failed to fetch experiments")
  }

  return response.json()
}

export async function getExperimentDetails(id: number) {
  const response = await fetch(`/api/experiments/${id}`)

  if (!response.ok) {
    throw new Error("Failed to fetch experiment details")
  }

  return response.json()
}

export async function deleteExperiment(id: number) {
  const response = await fetch(`/api/experiments/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete experiment")
  }

  return response.json()
}

export async function runExperiment(id: number) {
  const response = await fetch(`/api/experiments/${id}/run`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Failed to run experiment")
  }

  return response.json()
}

