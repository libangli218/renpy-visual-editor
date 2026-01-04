/**
 * Test parsing the_question script to verify all labels are parsed
 */

import { describe, it, expect } from 'vitest'
import { parse } from './renpyParser'
import { FlowGraphBuilder } from '../components/nodeMode/FlowGraphBuilder'

const THE_QUESTION_SCRIPT = `
define s = Character(_("Sylvie"), color="#c8ffc8")
define m = Character(_("Me"), color="#c8c8ff")

default book = False

label start:
    play music "illurock.opus"
    scene bg lecturehall
    "It's only when I hear the sounds..."
    menu:
        "As soon as she catches my eye, I decide..."
        "To ask her right away.":
            jump rightaway
        "To ask her later.":
            jump later

label rightaway:
    s "Hi there! How was class?"
    m "Good..."
    menu:
        s "Sure, but what's a \\"visual novel?\\""
        "It's a videogame.":
            jump game
        "It's an interactive book.":
            jump book

label game:
    m "It's a kind of videogame..."
    jump marry

label book:
    m "It's like an interactive book..."
    jump marry

label marry:
    "And so, we become a visual novel creating duo."
    return

label later:
    "I can't get up the nerve to ask right now."
    return
`

describe('the_question script parsing', () => {
  it('should parse all labels from the_question script', () => {
    const result = parse(THE_QUESTION_SCRIPT, 'script.rpy')
    
    // Get all label names
    const labels = result.ast.statements
      .filter(s => s.type === 'label')
      .map(s => (s as any).name)
    
    expect(labels).toContain('start')
    expect(labels).toContain('rightaway')
    expect(labels).toContain('game')
    expect(labels).toContain('book')
    expect(labels).toContain('marry')
    expect(labels).toContain('later')
    expect(labels.length).toBe(6)
  })

  it('should build flow graph with all scene nodes', () => {
    const result = parse(THE_QUESTION_SCRIPT, 'script.rpy')
    const builder = new FlowGraphBuilder()
    const graph = builder.buildGraph(result.ast)
    
    // Get all scene nodes (one per label)
    const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
    const sceneLabels = sceneNodes.map(n => n.data.label)
    
    expect(sceneLabels).toContain('start')
    expect(sceneLabels).toContain('rightaway')
    expect(sceneLabels).toContain('game')
    expect(sceneLabels).toContain('book')
    expect(sceneLabels).toContain('marry')
    expect(sceneLabels).toContain('later')
    expect(sceneNodes.length).toBe(6)
  })

  it('should create edges from menu choices to target labels', () => {
    const result = parse(THE_QUESTION_SCRIPT, 'script.rpy')
    const builder = new FlowGraphBuilder()
    const graph = builder.buildGraph(result.ast)
    
    // Find menu nodes
    const menuNodes = graph.nodes.filter(n => n.type === 'menu')
    
    // Should have 2 menu nodes
    expect(menuNodes.length).toBe(2)
    
    // First menu should have 2 choices
    expect(menuNodes[0].data.choices?.length).toBe(2)
    
    // Second menu should also have 2 choices
    expect(menuNodes[1].data.choices?.length).toBe(2)
    
    // Find edges from menu nodes
    const menuEdges = graph.edges.filter(e => 
      menuNodes.some(m => m.id === e.source)
    )
    
    // Should have edges from menus to target labels (2 choices per menu = 4 edges)
    expect(menuEdges.length).toBe(4)
    
    // Verify edges point to actual scene nodes (not missing-xxx)
    const sceneNodes = graph.nodes.filter(n => n.type === 'scene')
    const sceneNodeIds = new Set(sceneNodes.map(n => n.id))
    
    for (const edge of menuEdges) {
      expect(sceneNodeIds.has(edge.target)).toBe(true)
      expect(edge.target).not.toContain('missing-')
    }
  })
})


describe('if statement parsing', () => {
  it('should parse if statement in marry label', () => {
    const SCRIPT_WITH_IF = `
label marry:
    "And so, we become a visual novel creating duo."
    "Over the years, we make lots of games."
    
    if book:
        "Our first game is based on one of Sylvie's ideas."
    
    "We take turns coming up with stories."
    return
`
    const result = parse(SCRIPT_WITH_IF, 'test.rpy')
    
    // Find marry label
    const marryLabel = result.ast.statements.find(
      s => s.type === 'label' && (s as any).name === 'marry'
    ) as any
    
    expect(marryLabel).toBeDefined()
    
    // Check body contains if statement
    const ifStatement = marryLabel.body.find((s: any) => s.type === 'if')
    expect(ifStatement).toBeDefined()
    expect(ifStatement.branches.length).toBe(1)
    expect(ifStatement.branches[0].condition).toBe('book')
    expect(ifStatement.branches[0].body.length).toBe(1)
    expect(ifStatement.branches[0].body[0].type).toBe('dialogue')
  })

  it('should build condition node for if statement', () => {
    const SCRIPT_WITH_IF = `
label marry:
    "And so, we become a visual novel creating duo."
    
    if book:
        "Our first game is based on one of Sylvie's ideas."
    
    "We take turns coming up with stories."
    return
`
    const result = parse(SCRIPT_WITH_IF, 'test.rpy')
    const builder = new FlowGraphBuilder()
    const graph = builder.buildGraph(result.ast)
    
    // Should have a condition node
    const conditionNodes = graph.nodes.filter(n => n.type === 'condition')
    expect(conditionNodes.length).toBe(1)
    expect(conditionNodes[0].data.condition).toBe('book')
  })
})
