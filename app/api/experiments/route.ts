import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sortField = searchParams.get("sort") || "created_at"
  const sortOrder = searchParams.get("order") || "desc"

  try {
    const experiments = await db.getExperiments(sortField, sortOrder)
    return NextResponse.json(experiments)
  } catch (error) {
    console.error("Error fetching experiments:", error)
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.learning_rate || !data.batch_size || !data.epochs || !data.optimizer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if experiment with same config already exists
    const existingExperiment = await db.findSimilarExperiment(data)
    if (existingExperiment) {
      return NextResponse.json(
        {
          error: "Similar experiment already exists",
          existingId: existingExperiment.id,
        },
        { status: 409 },
      )
    }

    // Create new experiment
    const experiment = await db.createExperiment(data)

    // Queue the experiment for execution
    await db.queueExperiment(experiment.id)

    return NextResponse.json(experiment, { status: 201 })
  } catch (error) {
    console.error("Error creating experiment:", error)
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 })
  }
}

