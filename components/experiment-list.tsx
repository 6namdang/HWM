"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Play, Trash, Eye, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getExperiments, deleteExperiment, runExperiment } from "@/lib/api"
import type { Experiment } from "@/types/experiment"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

type SortField = "created_at" | "accuracy" | "duration"
type SortOrder = "asc" | "desc"

export default function ExperimentList({
  onExperimentSelect,
}: {
  onExperimentSelect: (experiment: Experiment) => void
}) {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  useEffect(() => {
    fetchExperiments()
    // Set up polling for updates
    const interval = setInterval(fetchExperiments, 5000)
    return () => clearInterval(interval)
  }, [sortField, sortOrder])

  const fetchExperiments = async () => {
    try {
      const data = await getExperiments(sortField, sortOrder)
      setExperiments(data)
    } catch (error) {
      console.error("Failed to fetch experiments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch experiments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteExperiment(id)
      setExperiments(experiments.filter((exp) => exp.id !== id))
      toast({
        title: "Experiment deleted",
        description: "The experiment has been deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete experiment",
        variant: "destructive",
      })
    }
  }

  const handleRun = async (id: number) => {
    try {
      await runExperiment(id)
      toast({
        title: "Experiment started",
        description: "The experiment has been queued for execution",
      })
      fetchExperiments()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start experiment",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>
      case "failed":
        return <Badge className="bg-red-500">Failed</Badge>
      case "queued":
        return <Badge className="bg-yellow-500">Queued</Badge>
      default:
        return <Badge className="bg-gray-500">Not Started</Badge>
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading experiments...</div>
  }

  if (experiments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium">No experiments found</h3>
        <p className="text-sm text-gray-500 mt-2">Create a new experiment to get started</p>
      </div>
    )
  }

  return (
    <div>
      <Table>
        <TableCaption>A list of your MNIST experiments</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
              <div className="flex items-center">
                Created
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("accuracy")}>
              <div className="flex items-center">
                Accuracy
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("duration")}>
              <div className="flex items-center">
                Duration
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((experiment) => (
            <TableRow key={experiment.id}>
              <TableCell className="font-medium">{experiment.name}</TableCell>
              <TableCell>{getStatusBadge(experiment.status)}</TableCell>
              <TableCell>{new Date(experiment.created_at).toLocaleString()}</TableCell>
              <TableCell>{experiment.accuracy !== null ? `${(experiment.accuracy * 100).toFixed(2)}%` : "-"}</TableCell>
              <TableCell>{experiment.duration !== null ? `${experiment.duration.toFixed(2)}s` : "-"}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onExperimentSelect(experiment)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRun(experiment.id)}
                      disabled={experiment.status === "running" || experiment.status === "queued"}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Run Again
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(experiment.id)}
                      disabled={experiment.status === "running"}
                      className="text-red-600"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Toaster />
    </div>
  )
}

