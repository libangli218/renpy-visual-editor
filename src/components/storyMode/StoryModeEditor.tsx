import React, { useMemo, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { astToBlocks } from './blockConverter'
import { updateDialogueText, deleteNode, createNewDialogueAfter } from './blockUtils'
import { StoryBlock, DialogueBlock, NarrationBlock } from './types'
import { QuickInput, insertNodeAtEnd } from './QuickInput'
import { ASTNode } from '../../types/ast'
import {
  SceneBlockComponent,
  DialogueBlockComponent,
  NarrationBlockComponent,
  ShowBlockComponent,
  HideBlockComponent,
  MenuBlockComponent,
  NVLBlockComponent,
  NVLClearBlockComponent,
  WithBlockComponent,
  CallBlockComponent,
  JumpBlockComponent,
  ReturnBlockComponent,
  PauseBlockComponent,
  LabelBlockComponent,
  PlayMusicBlockComponent,
  PlaySoundBlockComponent,
  VoiceBlockComponent,
  StopAudioBlockComponent,
  PythonBlockComponent,
  IfBlockComponent,
  SetBlockComponent,
  RawBlockComponent,
} from './blocks'
import './StoryModeEditor.css'

/**
 * StoryModeEditor component - Linear script editing view
 * Implements Requirements 6.1, 6.2, 6.4, 6.5: Block list rendering and editing
 * 
 * Features:
 * - Renders AST as linear block list
 * - Supports all block types (scene, dialogue, menu, etc.)
 * - Block selection and highlighting
 * - Text editing with real-time save
 * - Enter key creates new block
 * - Block deletion
 */
export const StoryModeEditor: React.FC = () => {
  const { ast, setAst, selectedBlockId, setSelectedBlockId } = useEditorStore()

  // Convert AST to blocks
  const blocks = useMemo(() => {
    if (!ast) return []
    return astToBlocks(ast)
  }, [ast])

  // Handle block click
  const handleBlockClick = useCallback(
    (blockId: string) => {
      setSelectedBlockId(blockId)
    },
    [setSelectedBlockId]
  )

  // Handle text change for dialogue/narration blocks
  const handleTextChange = useCallback(
    (blockId: string, newText: string) => {
      if (!ast) return
      const updatedAst = updateDialogueText(ast, blockId, newText)
      setAst(updatedAst)
    },
    [ast, setAst]
  )

  // Handle Enter key - create new dialogue block
  const handleEnterPress = useCallback(
    (blockId: string, speaker: string | null) => {
      if (!ast) return
      const { ast: updatedAst, newNodeId } = createNewDialogueAfter(ast, blockId, speaker)
      setAst(updatedAst)
      // Select the new block
      setSelectedBlockId(newNodeId)
    },
    [ast, setAst, setSelectedBlockId]
  )

  // Handle block deletion
  const handleDelete = useCallback(
    (blockId: string) => {
      if (!ast) return
      const updatedAst = deleteNode(ast, blockId)
      setAst(updatedAst)
      setSelectedBlockId(null)
    },
    [ast, setAst, setSelectedBlockId]
  )

  // Handle quick input submission
  const handleQuickInputSubmit = useCallback(
    (node: ASTNode) => {
      if (!ast) return
      const updatedAst = insertNodeAtEnd(ast, node)
      setAst(updatedAst)
      setSelectedBlockId(node.id)
    },
    [ast, setAst, setSelectedBlockId]
  )

  // Render empty state
  if (!ast || blocks.length === 0) {
    return (
      <div className="story-mode-editor-container" data-testid="story-mode-editor">
        <div className="story-mode-empty">
          <h3>Story Mode</h3>
          <p>No content to display</p>
          <p>Open a project or create a new script to get started.</p>
        </div>
        <QuickInput onSubmit={handleQuickInputSubmit} />
      </div>
    )
  }

  return (
    <div className="story-mode-editor-container" data-testid="story-mode-editor">
      <div className="story-block-list" role="list" aria-label="Story blocks">
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            selected={selectedBlockId === block.id}
            onClick={() => handleBlockClick(block.id)}
            onTextChange={(text) => handleTextChange(block.id, text)}
            onEnterPress={() => {
              const speaker = block.type === 'dialogue' ? (block as DialogueBlock).speaker : null
              handleEnterPress(block.id, speaker)
            }}
            onDelete={() => handleDelete(block.id)}
          />
        ))}
      </div>
      <QuickInput onSubmit={handleQuickInputSubmit} />
    </div>
  )
}

/**
 * BlockRenderer - Renders the appropriate component for each block type
 */
interface BlockRendererProps {
  block: StoryBlock
  selected: boolean
  onClick: () => void
  onTextChange?: (text: string) => void
  onEnterPress?: () => void
  onDelete?: () => void
}

const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  selected,
  onClick,
  onTextChange,
  onEnterPress,
  onDelete,
}) => {
  switch (block.type) {
    case 'scene':
      return <SceneBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'dialogue':
      return (
        <DialogueBlockComponent
          block={block}
          selected={selected}
          onClick={onClick}
          onTextChange={onTextChange}
          onEnterPress={onEnterPress}
          onDelete={onDelete}
        />
      )
    case 'narration':
      return (
        <NarrationBlockComponent
          block={block as NarrationBlock}
          selected={selected}
          onClick={onClick}
          onTextChange={onTextChange}
          onEnterPress={onEnterPress}
          onDelete={onDelete}
        />
      )
    case 'show':
      return <ShowBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'hide':
      return <HideBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'menu':
      return <MenuBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'nvl':
      return <NVLBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'nvl_clear':
      return <NVLClearBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'with':
      return <WithBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'call':
      return <CallBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'jump':
      return <JumpBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'return':
      return <ReturnBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'pause':
      return <PauseBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'play_music':
      return <PlayMusicBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'play_sound':
      return <PlaySoundBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'voice':
      return <VoiceBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'stop_audio':
      return <StopAudioBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'python':
      return <PythonBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'if':
      return <IfBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'set':
      return <SetBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'label':
      return <LabelBlockComponent block={block} selected={selected} onClick={onClick} />
    case 'raw':
      return <RawBlockComponent block={block} selected={selected} onClick={onClick} />
    default:
      return null
  }
}
