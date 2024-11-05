import React, { useEffect, useState, useContext } from 'react'
import { Stack, Text } from '@fluentui/react'
import {
  Book28Regular,
  Book32Regular,
  BookRegular,
  News28Regular,
  NewsRegular,
  Notepad28Regular,
  Notepad32Regular
} from '@fluentui/react-icons'
import { Button, Avatar } from '@fluentui/react-components'
import styles from './Sidebar.module.css'
import { AppStateContext } from '../../state/AppProvider'
import { getUserInfo } from '../../api'
import { useNavigate, useLocation } from 'react-router-dom'

enum NavigationButtonStates {
  Active = 'active',
  Inactive = 'inactive',
  Disabled = 'disabled'
}

interface NavigationButtonProps {
  text: string
  buttonState: NavigationButtonStates
  onClick: () => void
}

const NavigationButton = ({ text, buttonState, onClick }: NavigationButtonProps) => {
  const fontColor = {
    [NavigationButtonStates.Active]: '#367AF6',
    [NavigationButtonStates.Inactive]: '#BEBBB8',
    [NavigationButtonStates.Disabled]: '#797775'
  }[buttonState]

  const iconElements: { [key: string]: JSX.Element } = {
    Browse: (
      <News28Regular
        color={fontColor}
        cursor={buttonState === NavigationButtonStates.Disabled ? 'not-allowed' : 'pointer'}
      />
    ),
    Generate: (
      <Book28Regular
        color={fontColor}
        cursor={buttonState === NavigationButtonStates.Disabled ? 'not-allowed' : 'pointer'}
      />
    ),
    Draft: (
      <Notepad28Regular
        color={fontColor}
        cursor={buttonState === NavigationButtonStates.Disabled ? 'not-allowed' : 'pointer'}
      />
    )
  }

  const buttonStyle = {
    [NavigationButtonStates.Active]: styles.navigationButtonActive,
    [NavigationButtonStates.Inactive]: styles.navigationButton,
    [NavigationButtonStates.Disabled]: styles.navigationButtonDisabled
  }[buttonState]

  const icon = iconElements[text]

  return (
    <Stack
      onClick={buttonState === NavigationButtonStates.Inactive ? onClick : () => {}}
      className={buttonStyle}
      style={{ cursor: buttonState === NavigationButtonStates.Disabled ? 'not-allowed' : 'pointer' }}>
      <Button appearance="transparent" size="large" icon={icon} style={{ padding: '0' }} />
      <Text
        style={{
          color: fontColor,
          cursor: buttonState === NavigationButtonStates.Disabled ? 'not-allowed' : 'pointer'
        }}>
        {text}
      </Text>
    </Stack>
  )
}

const Sidebar = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState<string>('')

  useEffect(() => {
    if (!appStateContext) {
      throw new Error('useAppState must be used within a AppStateProvider')
    }

    if (appStateContext.state.frontendSettings?.auth_enabled) {
      getUserInfo()
        .then(res => {
          const name: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? ''
          setName(name)
        })
        .catch(err => {
          console.error('Error fetching user info: ', err)
        })
    }
  }, [appStateContext])

  // determine url from react-router-dom
  const determineView = () => {
    const url = location.pathname

    const urlArr = url.split('/')
    const currentUrl = urlArr[urlArr.length - 1]
    return currentUrl
  }

  const currentView = determineView()
  const isGenerating = appStateContext?.state.isGenerating

  return (
    <Stack className={styles.sidebarContainer}>
      <Stack horizontal className={styles.avatarContainer}>
        <Avatar color="colorful" name={name} />
      </Stack>
      <Stack className={styles.sidebarNavigationContainer}>
        <NavigationButton
          text={'Browse'}
          buttonState={
            currentView === 'chat'
              ? NavigationButtonStates.Active
              : appStateContext?.state.isGenerating
                ? NavigationButtonStates.Disabled
                : NavigationButtonStates.Inactive
          }
          onClick={() => {
            if (!isGenerating) {
              navigate('/chat')
            }
          }}
        />
        <NavigationButton
          text={'Generate'}
          buttonState={
            currentView === 'generate'
              ? NavigationButtonStates.Active
              : appStateContext?.state.isGenerating
                ? NavigationButtonStates.Disabled
                : NavigationButtonStates.Inactive
          }
          onClick={() => {
            if (!isGenerating) {
              navigate('/generate')
            }
          }}
        />
        <NavigationButton
          text={'Draft'}
          buttonState={
            currentView === 'draft'
              ? NavigationButtonStates.Active
              : appStateContext?.state.isGenerating
                ? NavigationButtonStates.Disabled
                : NavigationButtonStates.Inactive
          }
          onClick={() => {
            if (!isGenerating) {
              navigate('/draft')
            }
          }}
        />
      </Stack>
    </Stack>
  )
}

export default Sidebar
