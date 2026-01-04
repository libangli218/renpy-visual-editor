/**
 * Property-Based Tests for Node Mode Editor
 * 
 * Feature: renpy-visual-editor, Property 11: Node Type Completeness
 * Validates: Requirements 5.1
 * 
 * For any node type in the specification, the editor should be able to create and render it.
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { nodeTypes, supportedNodeTypes, isNodeTypeSupported } from './nodeTypes'
import { getNodeTypeLabel, getNodeTypeColor } from './astNodeConverter'
import { getNodePorts } from './connectionUtils'

describe('Node Mode Property Tests', () => {
  /**
   * Property 11: Node Type Completeness
   * For any node type in the specification, the editor should be able to create and render it.
   * 
   * Feature: renpy-visual-editor, Property 11: Node Type Completeness
   * Validates: Requirements 5.1
   */
  describe('Property 11: Node Type Completeness', () => {
    // All required node types from the specification
    const requiredNodeTypes = [
      'label',
      'jump',
      'call',
      'return',
      'dialogue',
      'menu',
      'scene',
      'show',
      'hide',
      'with',
      'play',
      'stop',
      'if',
      'set',
      'python',
      'nvl',
      'pause',
      'define',
      'default',
      'raw',
    ]

    it('should have all required node types registered', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...requiredNodeTypes),
          (nodeType) => {
            // Each required node type should be in the nodeTypes registry
            return nodeType in nodeTypes
          }
        ),
        { numRuns: requiredNodeTypes.length }
      )
    })

    it('should support all required node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...requiredNodeTypes),
          (nodeType) => {
            // Each required node type should be supported
            return isNodeTypeSupported(nodeType)
          }
        ),
        { numRuns: requiredNodeTypes.length }
      )
    })

    it('should have labels for all supported node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedNodeTypes),
          (nodeType) => {
            const label = getNodeTypeLabel(nodeType)
            // Label should be a non-empty string
            return typeof label === 'string' && label.length > 0
          }
        ),
        { numRuns: supportedNodeTypes.length }
      )
    })

    it('should have colors for all supported node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedNodeTypes),
          (nodeType) => {
            const color = getNodeTypeColor(nodeType)
            // Color should be a valid hex color string
            return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
          }
        ),
        { numRuns: supportedNodeTypes.length }
      )
    })

    it('should have port definitions for all supported node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedNodeTypes),
          (nodeType) => {
            const ports = getNodePorts(nodeType)
            // Should return an object with sourcePorts and targetPorts arrays
            return (
              typeof ports === 'object' &&
              Array.isArray(ports.sourcePorts) &&
              Array.isArray(ports.targetPorts)
            )
          }
        ),
        { numRuns: supportedNodeTypes.length }
      )
    })

    it('should have React components for all supported node types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...supportedNodeTypes),
          (nodeType) => {
            const component = nodeTypes[nodeType]
            // Component should exist and be a valid React component
            // React.memo components are objects with $$typeof, not plain functions
            return (
              component !== undefined &&
              component !== null &&
              (typeof component === 'function' || 
               (typeof component === 'object' && '$$typeof' in component))
            )
          }
        ),
        { numRuns: supportedNodeTypes.length }
      )
    })
  })

  /**
   * Additional property tests for node mode functionality
   */
  describe('Node Type Properties', () => {
    it('should have unique labels for each node type', () => {
      const labels = supportedNodeTypes.map(getNodeTypeLabel)
      const uniqueLabels = new Set(labels)
      // All labels should be unique
      fc.assert(
        fc.property(fc.constant(null), () => {
          return labels.length === uniqueLabels.size
        }),
        { numRuns: 1 }
      )
    })

    it('should have unique colors for most node types', () => {
      const colors = supportedNodeTypes.map(getNodeTypeColor)
      const uniqueColors = new Set(colors)
      // Most colors should be unique (allow some overlap for related types)
      fc.assert(
        fc.property(fc.constant(null), () => {
          // At least 80% of colors should be unique
          return uniqueColors.size >= supportedNodeTypes.length * 0.8
        }),
        { numRuns: 1 }
      )
    })

    it('should have consistent port definitions for flow control nodes', () => {
      const flowControlNodes = ['label', 'jump', 'return']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...flowControlNodes),
          (nodeType) => {
            const ports = getNodePorts(nodeType)
            
            if (nodeType === 'label') {
              // Labels are entry points - no target port
              return ports.targetPorts.length === 0 && ports.sourcePorts.length > 0
            }
            
            if (nodeType === 'jump' || nodeType === 'return') {
              // Jump and return are exit points - no source port
              return ports.sourcePorts.length === 0 && ports.targetPorts.length > 0
            }
            
            return true
          }
        ),
        { numRuns: flowControlNodes.length }
      )
    })

    it('should have consistent port definitions for variable definition nodes', () => {
      const variableNodes = ['define', 'default']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...variableNodes),
          (nodeType) => {
            const ports = getNodePorts(nodeType)
            // Variable definitions are standalone - no connections
            return ports.sourcePorts.length === 0 && ports.targetPorts.length === 0
          }
        ),
        { numRuns: variableNodes.length }
      )
    })

    it('should have both source and target ports for most statement nodes', () => {
      const statementNodes = ['dialogue', 'scene', 'show', 'hide', 'with', 'play', 'stop', 'pause', 'nvl', 'set', 'python', 'call']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...statementNodes),
          (nodeType) => {
            const ports = getNodePorts(nodeType)
            // Statement nodes should have both source and target ports
            return ports.sourcePorts.length > 0 && ports.targetPorts.length > 0
          }
        ),
        { numRuns: statementNodes.length }
      )
    })
  })
})
