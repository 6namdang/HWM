import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const experiment = await db.getExperimentDetails(id)

    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    return NextResponse.json(experiment)
  } catch (error) {
    console.error("Error fetching experiment details:", error)
    return NextResponse.json({ error: "Failed to fetch experiment details" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if experiment exists
    const experiment = await db.getExperimentDetails(id)
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 })
    }

    // Check if experiment is running
    if (experiment.status === "running") {
      return NextResponse.json({ error: "Cannot delete a running experiment" }, { status: 400 })
    }

    await db.deleteExperiment(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting experiment:", error)
    return NextResponse.json({ error: "Failed to delete experiment" }, { status: 500 })
  }
}

