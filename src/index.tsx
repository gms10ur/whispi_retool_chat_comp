import React, { useState, useEffect, useRef } from 'react'
import { type FC } from 'react'
import { Retool } from '@tryretool/custom-component-support'

// Color Palette - Light Mode (3 temel renk: beyaz, siyah, pembe)
const colorPalette = {
  // Temel renkler
  white: '#ffffff',
  black: '#000000',
  pink: '#e50253',

  // Kullanım kolaylığı için alias'lar
  primary: '#e50253',
  primaryLight: 'rgba(229, 2, 83, 0.1)',

  // Metinler (light mode - siyah yazılar)
  text: '#000000',
  textSecondary: '#666666',
  textLight: '#ffffff', // Primary üzerindeki yazılar için beyaz kalır

  // Arkaplanlar (light mode - beyaz arkaplanlar)
  background: '#ffffff',

  // Borderlar (light mode - daha açık gri borderlar)
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  borderMedium: '#d0d0d0',
  borderDark: '#e0e0e0',

  // Mesaj kutuları
  message: {
    user: '#e50253', // User mesajı pembe kalır
    assistant: '#f5f5f5' // Assistant mesajı açık gri
  },

  // Durum renkleri (3 temel renkten türetilmiş)
  hover: 'rgba(229, 2, 83, 0.05)',
  selected: 'rgba(229, 2, 83, 0.1)',
  disabled: '#cccccc',

  // Error ve Success (pembe temalı)
  error: {
    background: 'rgba(229, 2, 83, 0.1)',
    text: '#e50253'
  },
  success: {
    background: 'rgba(229, 2, 83, 0.1)',
    text: '#e50253'
  }
}

// Type definitions
interface Character {
  id: string
  name: string
  profilePicture?: string
  statusText: string
  personalityTags?: string[]
  filterTags?: string[]
  age?: number
}

interface Message {
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface UserChat {
  characterId: string
  characterName: string
  characterAvatar?: string
  conversationId: string
  lastMessage?: string
  lastMessageTime?: string
  lastSeen?: number // Unix timestamp
}

export const WhispiChatInterface: FC = () => {
  // Retool props
  const [apiBaseUrl] = Retool.useStateString({
    name: 'apiBaseUrl',
    initialValue: 'https://us-central1-whispi-e61fa.cloudfunctions.net'
  })

  // State management
  const [currentUID, setCurrentUID] = useState<string | null>(null)
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    null
  )
  const [currentCharacterLastSeen, setCurrentCharacterLastSeen] = useState<
    number | null
  >(null)
  const [_currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [userChats, setUserChats] = useState<UserChat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showAnonymousModal, setShowAnonymousModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [accountCreationStatus, setAccountCreationStatus] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [showChatInterface, setShowChatInterface] = useState(false)
  const [typingIndicator, setTypingIndicator] = useState(false)
  const [error, setError] = useState('')
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false)
  const [isSelectingCharacter, setIsSelectingCharacter] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{
    characterId: string
    characterName: string
  } | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Filter tags
  const FILTER_TAGS = [
    'Realistic',
    'Anime',
    'Fantasy',
    'Sci-Fi',
    'Modern',
    'Friendly',
    'Mysterious',
    'Romantic',
    'Playful',
    'Serious',
    'Funny',
    'Intellectual',
    'Adventurous',
    'Caring',
    'Young Adult',
    'Mature',
    'MILF',
    'Girlfriend',
    'Boyfriend',
    'Teacher',
    'Student',
    'Asian',
    'European',
    'Slim',
    'Curvy'
  ]

  // Initialize component
  useEffect(() => {
    const savedUID = localStorage.getItem('whispi_uid')
    if (savedUID) {
      setUidInput(savedUID)
      handleSetCurrentUID(savedUID)
    }
  }, [])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [messages])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const generateDeviceId = () => {
    const existingDeviceId = localStorage.getItem('whispi_device_id')
    if (existingDeviceId) {
      return existingDeviceId
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as { deviceMemory?: number }).deviceMemory || 'unknown'
    ].join('|')

    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    const deviceId = 'device_' + Math.abs(hash).toString(36)
    localStorage.setItem('whispi_device_id', deviceId)
    return deviceId
  }

  const handleSetCurrentUID = (uid: string) => {
    setCurrentUID(uid)
    localStorage.setItem('whispi_uid', uid)
    loadUserChats(uid)
  }

  const loadUserChats = async (uid: string) => {
    if (!uid) {
      setError(
        'Please enter your UID if you have one, or create a new anonymous account.'
      )
      return
    }

    setIsLoadingChats(true)
    try {
      const response = await fetch(`${apiBaseUrl}/getUserChats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { uid } })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to get user chats')
      }

      setUserChats(result.result.conversations || [])
    } catch (error: unknown) {
      console.error('Error loading user chats:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('empty')
      ) {
        setUserChats([])
      } else {
        setError('Error loading chats: ' + errorMessage)
      }
    } finally {
      setIsLoadingChats(false)
    }
  }

  const createAnonymousAccount = async () => {
    if (!displayName.trim()) {
      setAccountCreationStatus('Please enter your name.')
      return
    }

    const birthYearNum = parseInt(birthYear)
    if (!birthYearNum || birthYearNum < 1900 || birthYearNum > 2025) {
      setAccountCreationStatus('Please enter a valid birth year.')
      return
    }

    setIsCreatingAccount(true)
    setAccountCreationStatus('Creating anonymous account...')

    try {
      // Create anonymous user
      const createUserResponse = await fetch(
        `${apiBaseUrl}/createAnonymousUser`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: {} })
        }
      )

      const createUserResult = await createUserResponse.json()
      if (!createUserResponse.ok) {
        throw new Error(
          createUserResult.error?.message || 'Failed to create anonymous user'
        )
      }

      const uid = createUserResult.result.uid

      // Onboard user
      setAccountCreationStatus('Setting up account...')
      const deviceId = generateDeviceId()

      const onboardResponse = await fetch(`${apiBaseUrl}/onboardUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            uid,
            deviceId,
            displayName,
            birthYear: birthYearNum
          }
        })
      })

      const onboardResult = await onboardResponse.json()
      if (!onboardResponse.ok) {
        throw new Error(
          onboardResult.error?.message || 'Failed to onboard user'
        )
      }

      // Save UID and set as current user
      localStorage.setItem('whispi_uid', uid)
      setUidInput(uid)
      handleSetCurrentUID(uid)

      setAccountCreationStatus('Account created successfully!')
      setTimeout(() => {
        setShowAnonymousModal(false)
        setDisplayName('')
        setBirthYear('')
        setAccountCreationStatus('')
      }, 2000)
    } catch (error: unknown) {
      console.error('Error creating anonymous account:', error)
      setAccountCreationStatus(
        'Error creating account: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const loadCharactersForModal = async () => {
    setIsLoadingCharacters(true)
    try {
      const response = await fetch(`${apiBaseUrl}/listCharacters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            limit: 20,
            filteredTags: [],
            prefetchMode: false
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to list characters')
      }

      setCharacters(result.result.characters || [])
      setFilteredCharacters(result.result.characters || [])
    } catch (error: unknown) {
      console.error('Error loading characters:', error)
      setError(
        'Error loading characters: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsLoadingCharacters(false)
    }
  }

  const filterCharacters = () => {
    const filtered = characters.filter((character) => {
      const matchesSearch =
        !searchTerm ||
        character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        character.statusText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (character.personalityTags &&
          character.personalityTags.some((tag: string) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ))

      const matchesFilters =
        activeFilters.length === 0 ||
        (character.filterTags &&
          activeFilters.every((filter) =>
            character.filterTags?.includes(filter)
          ))

      return matchesSearch && matchesFilters
    })

    setFilteredCharacters(filtered)
  }

  useEffect(() => {
    filterCharacters()
  }, [searchTerm, activeFilters, characters])

  const toggleFilter = (tag: string) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const selectCharacter = async (character: Character) => {
    setIsSelectingCharacter(true)
    try {
      const response = await fetch(`${apiBaseUrl}/newChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            characterId: character.id,
            uid: currentUID
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create new chat')
      }

      const chatData = result.result
      setCurrentCharacter(character)
      setCurrentCharacterLastSeen(null) // New character, no last seen data
      setCurrentConversationId(chatData.conversationId)
      setShowCharacterModal(false)

      if (!chatData.isNewConversation && chatData.messageCount > 0) {
        await loadChatHistory(character.id)
      } else {
        setMessages([])
      }

      setShowChatInterface(true)
      loadUserChats(currentUID!)
    } catch (error: unknown) {
      console.error('Error selecting character:', error)
      setError(
        'Error selecting character: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsSelectingCharacter(false)
    }
  }

  const openExistingChat = async (chat: UserChat) => {
    setCurrentCharacter({
      id: chat.characterId,
      name: chat.characterName,
      profilePicture: chat.characterAvatar,
      statusText: 'Online'
    })
    setCurrentCharacterLastSeen(chat.lastSeen || null)
    setCurrentConversationId(chat.conversationId)
    await loadChatHistory(chat.characterId)
    setShowChatInterface(true)
  }

  const loadChatHistory = async (characterId: string) => {
    if (!currentUID || !characterId) return

    setIsLoadingHistory(true)
    try {
      const response = await fetch(`${apiBaseUrl}/getChatHistory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            characterId,
            uid: currentUID,
            limit: 50
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to get chat history')
      }

      const historyMessages = result.result.messages || []
      setMessages(
        historyMessages.map(
          (msg: {
            content: string
            role: 'user' | 'assistant'
            timestamp: string
          }) => ({
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp)
          })
        )
      )
    } catch (error: unknown) {
      console.error('Error loading chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = async () => {
    if (isStreaming || !messageInput.trim() || !currentCharacter || !currentUID)
      return

    const message = messageInput.trim()
    setMessages((prev) => [
      ...prev,
      {
        content: message,
        role: 'user',
        timestamp: new Date()
      }
    ])
    setMessageInput('')
    setTypingIndicator(true)
    setIsStreaming(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/chatApi/chatStream?uid=${currentUID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUID}`
          },
          body: JSON.stringify({
            prompt: message,
            characterId: currentCharacter.id,
            uid: currentUID
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      setTypingIndicator(false)
      let fullResponse = ''
      let messageIndex = -1

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim() === '') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'chunk') {
                if (messageIndex === -1) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      content: '',
                      role: 'assistant',
                      timestamp: new Date()
                    }
                  ])
                  messageIndex = messages.length
                }
                fullResponse += parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  if (newMessages[newMessages.length - 1]) {
                    newMessages[newMessages.length - 1].content = fullResponse
                  }
                  return newMessages
                })
              } else if (parsed.type === 'complete') {
                fullResponse = parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  if (newMessages[newMessages.length - 1]) {
                    newMessages[newMessages.length - 1].content = fullResponse
                  }
                  return newMessages
                })
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message)
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }

      loadUserChats(currentUID)
    } catch (error: unknown) {
      console.error('Error sending message:', error)
      setError(
        'Error sending message: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setTypingIndicator(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLastSeenText = (lastSeen?: number | null) => {
    if (!lastSeen) return 'Online'

    const now = Date.now()
    const diffInMs = now - lastSeen
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    // Son 1 dakika içerisindeyse Online
    if (diffInMinutes < 1) {
      return 'Online'
    }

    // 1-59 dakika arası
    if (diffInMinutes < 60) {
      return `Last seen ${diffInMinutes}m ago`
    }

    // 1-23 saat arası
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `Last seen ${diffInHours}h ago`
    }

    // 1-30 gün arası
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `Last seen ${diffInDays}d ago`
    }

    // 30 günden fazla
    return 'Last seen long ago'
  }

  const openCharacterModal = () => {
    if (!currentUID) {
      setError('Please enter your UID first or create an anonymous account.')
      return
    }
    setShowCharacterModal(true)
    loadCharactersForModal()
  }

  const deleteChat = async (characterId: string) => {
    if (!currentUID) return

    setDeletingChatId(characterId)
    try {
      const response = await fetch(`${apiBaseUrl}/deleteChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            characterId,
            uid: currentUID
          }
        })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete chat')
      }

      // Remove from user chats
      setUserChats((prev) =>
        prev.filter((chat) => chat.characterId !== characterId)
      )

      // If this was the current chat, close it
      if (currentCharacter?.id === characterId) {
        setCurrentCharacter(null)
        setCurrentConversationId(null)
        setMessages([])
        setShowChatInterface(false)
      }

      setShowDeleteConfirmation(null)
    } catch (error: unknown) {
      console.error('Error deleting chat:', error)
      setError(
        'Error deleting chat: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setDeletingChatId(null)
    }
  }

  const handleDeleteClick = (
    e: React.MouseEvent,
    characterId: string,
    characterName: string
  ) => {
    e.stopPropagation() // Prevent opening the chat
    setShowDeleteConfirmation({ characterId, characterName })
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        background: colorPalette.background,
        height: '125vh',
        width: '125vw',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        transform: 'scale(0.8)',
        transformOrigin: 'center center',
        position: 'fixed',
        top: '50%',
        left: '50%',
        marginTop: '-62.5vh',
        marginLeft: '-62.5vw'
      }}
    >
      <div style={{ display: 'flex', height: '125vh', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '420px', // 360px'den 420px'e arttırdık (60px daha geniş)
            background: colorPalette.background,
            borderRight: `1px solid ${colorPalette.borderLight}`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: '20px',
              background: colorPalette.primary,
              color: colorPalette.textLight,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2 style={{ fontSize: '19px', fontWeight: 500, margin: 0 }}>
              Whispi Chat
            </h2>
            <button
              onClick={openCharacterModal}
              style={{
                background: colorPalette.white, // Beyaz arkaplan
                border: 'none',
                color: colorPalette.black, // Siyah yazı
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              New Chat
            </button>
          </div>

          {/* User Section */}
          <div
            style={{
              padding: '15px 20px',
              borderBottom: `1px solid ${colorPalette.borderLight}`,
              background: colorPalette.background
            }}
          >
            <input
              type="text"
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              onBlur={(e) =>
                e.target.value.trim() &&
                handleSetCurrentUID(e.target.value.trim())
              }
              placeholder="Enter your UID or create a new account"
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colorPalette.borderMedium}`,
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={() => setShowAnonymousModal(true)}
              style={{
                background: colorPalette.primary,
                color: colorPalette.textLight,
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%'
              }}
            >
              Create Anonymous Account
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                background: colorPalette.error.background,
                color: colorPalette.error.text,
                padding: '15px',
                margin: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

          {/* Chat List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 0,
              position: 'relative'
            }}
          >
            {/* Loading Overlay for Chat List */}
            {isLoadingChats && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  backdropFilter: 'blur(2px)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {/* Spinning Circle */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      border: `3px solid ${colorPalette.borderLight}`,
                      borderTop: `3px solid ${colorPalette.primary}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <div
                    style={{
                      color: colorPalette.text,
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Loading chats...
                  </div>
                </div>
              </div>
            )}
            {userChats.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: colorPalette.textSecondary
                }}
              >
                <div
                  style={{
                    fontSize: '60px',
                    marginBottom: '20px',
                    opacity: 0.5
                  }}
                >
                  💬
                </div>
                <h3 style={{ color: colorPalette.text }}>No chats yet</h3>
                <p style={{ color: colorPalette.text }}>
                  Click New Chat to get started
                </p>
              </div>
            ) : (
              userChats.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => openExistingChat(chat)}
                  style={{
                    display: 'flex',
                    padding: '15px 20px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${colorPalette.borderDark}`,
                    alignItems: 'center',
                    transition: 'background-color 0.2s',
                    backgroundColor:
                      currentCharacter?.id === chat.characterId
                        ? colorPalette.selected
                        : 'transparent',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colorPalette.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      currentCharacter?.id === chat.characterId
                        ? colorPalette.selected
                        : 'transparent')
                  }
                >
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      marginRight: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: colorPalette.borderDark,
                      fontSize: '24px'
                    }}
                  >
                    {chat.characterAvatar ? (
                      <img
                        src={chat.characterAvatar}
                        alt={chat.characterName}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                        }}
                      />
                    ) : (
                      '🧑‍💼'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '16px',
                        marginBottom: '4px',
                        color: colorPalette.text // Light mode - siyah yazı
                      }}
                    >
                      {chat.characterName}
                    </div>
                    <div
                      style={{
                        color: colorPalette.textSecondary,
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chat.lastMessage || 'New conversation'}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        color: colorPalette.textSecondary,
                        fontSize: '12px'
                      }}
                    >
                      {chat.lastMessageTime
                        ? new Date(chat.lastMessageTime).toLocaleTimeString(
                            'tr-TR',
                            {
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )
                        : ''}
                    </div>
                    <button
                      onClick={(e) =>
                        handleDeleteClick(
                          e,
                          chat.characterId,
                          chat.characterName
                        )
                      }
                      disabled={deletingChatId === chat.characterId}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor:
                          deletingChatId === chat.characterId
                            ? 'not-allowed'
                            : 'pointer',
                        color: colorPalette.textSecondary,
                        fontSize: '16px',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        opacity: deletingChatId === chat.characterId ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (deletingChatId !== chat.characterId) {
                          e.currentTarget.style.backgroundColor =
                            colorPalette.error.background
                          e.currentTarget.style.color = colorPalette.error.text
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (deletingChatId !== chat.characterId) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color =
                            colorPalette.textSecondary
                        }
                      }}
                    >
                      {deletingChatId === chat.characterId ? (
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            border: `2px solid ${colorPalette.borderLight}`,
                            borderTop: `2px solid ${colorPalette.primary}`,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}
                        />
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: colorPalette.background,
            height: '125vh',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {!showChatInterface ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: colorPalette.textSecondary,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>💬</div>
              <h2 style={{ color: colorPalette.text }}>
                Welcome to Whispi Chat
              </h2>
              <p style={{ color: colorPalette.text }}>
                Select a chat or start a new conversation
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '125vh',
                overflow: 'hidden'
              }}
            >
              {/* Chat Header */}
              <div
                style={{
                  background: colorPalette.background,
                  padding: '15px 20px',
                  borderBottom: `1px solid ${colorPalette.borderLight}`,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: colorPalette.borderDark,
                    fontSize: '20px'
                  }}
                >
                  {currentCharacter?.profilePicture ? (
                    <img
                      src={currentCharacter.profilePicture}
                      alt={currentCharacter.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                      }}
                    />
                  ) : (
                    '🧑‍💼'
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      marginBottom: '2px',
                      margin: 0,
                      color: colorPalette.text // Light mode - siyah yazı
                    }}
                  >
                    {currentCharacter?.name}
                  </h3>
                  <div
                    style={{
                      color: colorPalette.textSecondary,
                      fontSize: '13px'
                    }}
                  >
                    {typingIndicator ? (
                      <span style={{ fontStyle: 'italic' }}>Typing...</span>
                    ) : (
                      getLastSeenText(currentCharacterLastSeen)
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div
                ref={chatMessagesRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  paddingBottom: '20px',
                  background:
                    'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23e9edef" opacity="0.5"/></pattern></defs><rect x="0" y="0" width="100" height="100" fill="url(%23pattern)"/></svg>\')',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Loading Overlay for Chat History */}
                {isLoadingHistory && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255, 255, 255, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      {/* Spinning Circle */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          border: `3px solid ${colorPalette.borderLight}`,
                          borderTop: `3px solid ${colorPalette.primary}`,
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}
                      />
                      <div
                        style={{
                          color: colorPalette.text,
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        Loading chat history...
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent:
                        message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '65%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        position: 'relative',
                        wordWrap: 'break-word',
                        background:
                          message.role === 'user'
                            ? colorPalette.message.user
                            : colorPalette.message.assistant,
                        color:
                          message.role === 'user'
                            ? colorPalette.textLight
                            : colorPalette.black,
                        marginLeft: message.role === 'user' ? 'auto' : '0',
                        marginRight: message.role === 'user' ? '0' : 'auto'
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color:
                            message.role === 'user'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : 'rgba(0, 0, 0, 0.7)',
                          marginTop: '2px',
                          textAlign: message.role === 'user' ? 'right' : 'left'
                        }}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}

                {typingIndicator && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      marginBottom: '15px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        background: colorPalette.message.assistant,
                        borderRadius: '8px',
                        width: 'fit-content'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '3px'
                        }}
                      >
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '6px',
                              background: colorPalette.black,
                              borderRadius: '50%',
                              animation: `typing 1.4s infinite ease-in-out ${-0.32 + i * 0.16}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div
                style={{
                  background: colorPalette.background,
                  padding: '12px 16px',
                  borderTop: `1px solid ${colorPalette.borderLight}`,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  flexShrink: 0,
                  marginTop: 'auto',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    // Reset height to auto to get the correct scrollHeight
                    e.target.style.height = '36px'
                    // Set new height based on content, with min and max limits
                    const newHeight = Math.min(
                      Math.max(e.target.scrollHeight, 36),
                      120
                    )
                    e.target.style.height = newHeight + 'px'
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: `1px solid ${colorPalette.borderMedium}`,
                    borderRadius: '18px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    maxHeight: '120px',
                    minHeight: '36px',
                    height: '36px',
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none' // Internet Explorer 10+
                  }}
                  className="hide-scrollbar"
                />
                <button
                  onClick={sendMessage}
                  disabled={isStreaming || !messageInput.trim()}
                  style={{
                    background:
                      isStreaming || !messageInput.trim()
                        ? colorPalette.disabled
                        : colorPalette.primary,
                    color: colorPalette.textLight,
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '18px',
                    cursor:
                      isStreaming || !messageInput.trim()
                        ? 'not-allowed'
                        : 'pointer',
                    fontSize: '14px',
                    minWidth: '70px',
                    height: '36px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Character Selection Modal */}
      {showCharacterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCharacterModal(false)
              setActiveFilters([])
              setSearchTerm('')
            }
          }}
        >
          <div
            style={{
              background: colorPalette.background,
              borderRadius: '12px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px',
                background: colorPalette.primary,
                color: colorPalette.textLight,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
                Select Character
              </h3>
              <button
                onClick={() => {
                  setShowCharacterModal(false)
                  setActiveFilters([])
                  setSearchTerm('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colorPalette.textLight,
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                padding: '20px',
                borderBottom: `1px solid ${colorPalette.borderLight}`
              }}
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search characters..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colorPalette.borderMedium}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Filter Tags */}
            <div
              style={{
                padding: '15px 20px',
                borderBottom: `1px solid ${colorPalette.borderLight}`,
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            >
              {FILTER_TAGS.map((tag) => (
                <span
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    margin: '2px',
                    background: activeFilters.includes(tag)
                      ? colorPalette.primary
                      : colorPalette.borderLight,
                    color: activeFilters.includes(tag)
                      ? colorPalette.textLight // Pembe arkaplan üzerinde beyaz yazı
                      : colorPalette.text, // Light mode - açık gri arkaplan üzerinde siyah yazı
                    borderRadius: '12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Character List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 0,
                position: 'relative'
              }}
            >
              {/* Loading Overlay for Character Modal */}
              {(isLoadingCharacters || isSelectingCharacter) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Spinning Circle */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        border: `3px solid ${colorPalette.borderLight}`,
                        borderTop: `3px solid ${colorPalette.primary}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    <div
                      style={{
                        color: colorPalette.text,
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {isLoadingCharacters
                        ? 'Loading characters...'
                        : 'Selecting character...'}
                    </div>
                  </div>
                </div>
              )}

              {filteredCharacters.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: colorPalette.text // Light mode - siyah yazı
                  }}
                >
                  No characters found
                </div>
              ) : (
                filteredCharacters.map((character, index) => (
                  <div
                    key={index}
                    onClick={() => selectCharacter(character)}
                    style={{
                      display: 'flex',
                      padding: '15px 20px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${colorPalette.borderDark}`,
                      alignItems: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        colorPalette.hover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: colorPalette.borderDark,
                        fontSize: '24px'
                      }}
                    >
                      {character.profilePicture ? (
                        <img
                          src={character.profilePicture}
                          alt={character.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = '🧑‍💼'
                          }}
                        />
                      ) : (
                        '🧑‍💼'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '16px',
                          marginBottom: '4px',
                          color: colorPalette.text // Light mode - siyah yazı
                        }}
                      >
                        {character.name}
                      </div>
                      <div
                        style={{
                          color: colorPalette.textSecondary,
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}
                      >
                        {character.statusText}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px'
                        }}
                      >
                        {(character.personalityTags || [])
                          .slice(0, 3)
                          .map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              style={{
                                background: colorPalette.borderLight,
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: colorPalette.text // Light mode - siyah yazı
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        {character.age && (
                          <span
                            style={{
                              background: colorPalette.borderLight,
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: colorPalette.text // Light mode - siyah yazı
                            }}
                          >
                            {character.age} yaş
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anonymous Account Modal */}
      {showAnonymousModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAnonymousModal(false)
              setDisplayName('')
              setBirthYear('')
              setAccountCreationStatus('')
            }
          }}
        >
          <div
            style={{
              background: colorPalette.background,
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px',
                background: colorPalette.primary,
                color: colorPalette.textLight,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
                Create Anonymous Account
              </h3>
              <button
                onClick={() => {
                  setShowAnonymousModal(false)
                  setDisplayName('')
                  setBirthYear('')
                  setAccountCreationStatus('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colorPalette.textLight,
                  fontSize: '24px',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '20px', position: 'relative' }}>
              {/* Loading Overlay for Account Creation */}
              {isCreatingAccount && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                    borderRadius: '0 0 12px 12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    {/* Spinning Circle */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        border: `3px solid ${colorPalette.borderLight}`,
                        borderTop: `3px solid ${colorPalette.primary}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    <div
                      style={{
                        color: colorPalette.text,
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      Creating account...
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: '10px 0' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 500,
                    color: colorPalette.text // Light mode - siyah yazı
                  }}
                >
                  Name:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colorPalette.borderMedium}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '15px',
                    boxSizing: 'border-box'
                  }}
                />

                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 500,
                    color: colorPalette.text // Light mode - siyah yazı
                  }}
                >
                  Birth Year:
                </label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Enter your birth year..."
                  min="1900"
                  max="2025"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colorPalette.borderMedium}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={createAnonymousAccount}
                disabled={isCreatingAccount}
                style={{
                  background: isCreatingAccount
                    ? colorPalette.disabled
                    : colorPalette.primary,
                  color: colorPalette.textLight,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  cursor: isCreatingAccount ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  width: '200px',
                  margin: '0 auto',
                  display: 'block'
                }}
              >
                {isCreatingAccount ? 'Creating Account...' : 'Create Account'}
              </button>
              {accountCreationStatus && (
                <div
                  style={{
                    marginTop: '15px',
                    fontSize: '14px',
                    color: accountCreationStatus.includes('error')
                      ? colorPalette.error.text
                      : accountCreationStatus.includes('successfully')
                        ? colorPalette.primary
                        : colorPalette.textSecondary
                  }}
                >
                  {accountCreationStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirmation(null)
            }
          }}
        >
          <div
            style={{
              background: colorPalette.background,
              borderRadius: '12px',
              width: '90%',
              maxWidth: '400px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDeleteConfirmation(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                color: colorPalette.text,
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>

            <h3
              style={{
                fontSize: '16px',
                fontWeight: 500,
                margin: 0,
                color: colorPalette.text
              }}
            >
              Delete Chat
            </h3>
            <p
              style={{
                color: colorPalette.textSecondary,
                fontSize: '14px',
                margin: 0
              }}
            >
              Are you sure you want to delete your chat with{' '}
              {showDeleteConfirmation.characterName}?
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <button
                onClick={() => deleteChat(showDeleteConfirmation.characterId)}
                style={{
                  background: colorPalette.primary,
                  color: colorPalette.textLight,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  flex: 1
                }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirmation(null)}
                style={{
                  background: colorPalette.borderLight,
                  color: colorPalette.text,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes typing {
          0%,
          80%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
