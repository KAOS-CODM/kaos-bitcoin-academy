import type { ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isSimulationId } from '../features/playground/data'
import type { SimulationId } from '../features/playground/types'
import { WalletCreationSimulation } from '../features/playground/simulations/WalletCreationSimulation'
import { KeyRelationshipsSimulation } from '../features/playground/simulations/KeyRelationshipsSimulation'
import { TransactionConstructionSimulation } from '../features/playground/simulations/TransactionConstructionSimulation'
import { BroadcastingSimulation } from '../features/playground/simulations/BroadcastingSimulation'
import { BlockFormationSimulation } from '../features/playground/simulations/BlockFormationSimulation'
import { MiningSimulation } from '../features/playground/simulations/MiningSimulation'

const SIMULATION_COMPONENTS: Record<SimulationId, ComponentType> = {
  'wallet-creation': WalletCreationSimulation,
  'key-relationships': KeyRelationshipsSimulation,
  'transaction-construction': TransactionConstructionSimulation,
  broadcasting: BroadcastingSimulation,
  'block-formation': BlockFormationSimulation,
  mining: MiningSimulation,
}

export function PlaygroundSimulation() {
  const { simulationId } = useParams<{ simulationId: string }>()

  if (!isSimulationId(simulationId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-parchment">Simulation not found</h1>
        <p className="mt-2 leading-7 text-muted">
          That playground simulation does not exist. Return to the playground to choose one of the
          six available demonstrations.
        </p>
        <Link
          to="/playground"
          className="mt-5 inline-block rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
        >
          Back to the playground
        </Link>
      </div>
    )
  }

  const Simulation = SIMULATION_COMPONENTS[simulationId]
  return <Simulation />
}
