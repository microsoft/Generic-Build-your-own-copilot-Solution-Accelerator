import React, { useEffect, useState, useContext } from 'react'
import { Stack, Text } from '@fluentui/react'
import { Book28Regular, Book32Regular, BookRegular, News28Regular, NewsRegular, Notepad28Regular, Notepad32Regular } from '@fluentui/react-icons'
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
    'Browse': <News28Regular color={fontColor}/>,
    'Generate': <Book28Regular color={fontColor}/>,
    'Draft': <Notepad28Regular color={fontColor}/>
  }

  const buttonStyle = {
    [NavigationButtonStates.Active]: styles.navigationButtonActive,
    [NavigationButtonStates.Inactive]: styles.navigationButton,
    [NavigationButtonStates.Disabled]: styles.navigationButtonDisabled
  }[buttonState]

  const icon = iconElements[text]

  return (
    <Stack onClick={buttonState === NavigationButtonStates.Inactive ? onClick : () => {}} className={buttonStyle}>
      <Button appearance="transparent"
        size="large"
        icon={icon}
        style={{ padding: '0' }}
      />
      <Text style={{ color: fontColor }}>{text}</Text>
    </Stack>
  )
}

const Sidebar = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const navigate = useNavigate()
  const location = useLocation();
  const [name, setName] = useState<string>("")

  useEffect(() => {
    if (!appStateContext) { throw new Error('useAppState must be used within a AppStateProvider') }

    if (appStateContext.state.frontendSettings?.auth_enabled) {
      getUserInfo().then((res) => {
        const name: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? ''
        setName(name)
      }).catch((err) => {
        console.error('Error fetching user info: ', err)
      })
    }
  }, [])

  // determine url from react-router-dom  
  const determineView = () => {
    const url = location.pathname

    const urlArr = url.split('/')
    const currentUrl = urlArr[urlArr.length - 1]
    return currentUrl
  }

  const currentView = determineView()

  // inactive, disabled, active
  var draftButtonState = NavigationButtonStates.Disabled
  if (appStateContext?.state.draftedDocument) { draftButtonState = currentView === 'draft' ? NavigationButtonStates.Active : NavigationButtonStates.Inactive }

  return (
    <Stack className={styles.sidebarContainer}>
      <Stack horizontal className={styles.avatarContainer}>
        <Avatar color="colorful" name={name} />
      </Stack>
      <Stack className={styles.sidebarNavigationContainer}>
        <NavigationButton text={"Browse"} buttonState={currentView === 'chat' ? NavigationButtonStates.Active : NavigationButtonStates.Inactive} onClick={() => { navigate("/chat") }} />
        <NavigationButton text={"Generate"} buttonState={currentView === 'generate' ? NavigationButtonStates.Active : NavigationButtonStates.Inactive} onClick={() => { navigate("/generate") }} />
        <NavigationButton text={"Draft"} buttonState={draftButtonState} onClick={() => { navigate("/draft") }} />
      </Stack>
    </Stack>
  )
}

export default Sidebar
