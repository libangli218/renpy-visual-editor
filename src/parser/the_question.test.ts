/**
 * Test parsing the_question script to verify all labels are parsed
 */

import { describe, it, expect } from 'vitest'
import { parse } from './renpyParser'

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

  it('should parse menu choices correctly', () => {
    const result = parse(THE_QUESTION_SCRIPT, 'script.rpy')
    
    // Find start label
    const startLabel = result.ast.statements.find(
      s => s.type === 'label' && (s as any).name === 'start'
    ) as any
    
    expect(startLabel).toBeDefined()
    
    // Find menu in start label
    const menu = startLabel.body.find((s: any) => s.type === 'menu')
    expect(menu).toBeDefined()
    expect(menu.choices.length).toBe(2)
    expect(menu.choices[0].text).toBe('To ask her right away.')
    expect(menu.choices[1].text).toBe('To ask her later.')
  })

  it('should parse jump statements in menu choices', () => {
    const result = parse(THE_QUESTION_SCRIPT, 'script.rpy')
    
    // Find start label
    const startLabel = result.ast.statements.find(
      s => s.type === 'label' && (s as any).name === 'start'
    ) as any
    
    // Find menu in start label
    const menu = startLabel.body.find((s: any) => s.type === 'menu')
    
    // Check jump targets in choices
    const choice1Jump = menu.choices[0].body.find((s: any) => s.type === 'jump')
    const choice2Jump = menu.choices[1].body.find((s: any) => s.type === 'jump')
    
    expect(choice1Jump).toBeDefined()
    expect(choice1Jump.target).toBe('rightaway')
    expect(choice2Jump).toBeDefined()
    expect(choice2Jump.target).toBe('later')
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
})
