import React, { useEffect, useState, useContext } from 'react'
import { Stack, Text } from '@fluentui/react'
import { Book28Regular, Book32Regular, BookRegular, News28Regular, NewsRegular, Notepad28Regular, Notepad32Regular } from '@fluentui/react-icons'
import { Button, Avatar } from '@fluentui/react-components'
import styles from './Sidebar.module.css'
import { AppStateContext } from '../../state/AppProvider'
import { getUserInfo } from '../../api'
import { useNavigate, useLocation } from 'react-router-dom'

interface NavigationButtonProps {
  text: string
  isActive: boolean
  onClick: () => void
}

const NavigationButton = ({ text, isActive, onClick }: NavigationButtonProps) => {
  const fontColor = isActive ? '#367AF6' : '#BEBBB8'
  const iconElements: { [key: string]: JSX.Element } = {
    'Browse': <News28Regular color={fontColor}/>,
    'Generate': <Book28Regular color={fontColor}/>,
    'Draft': <Notepad28Regular color={fontColor}/>
  }

  const icon = iconElements[text]

  return (
    <Stack onClick={onClick} className={isActive ? styles.navigationButtonActive : styles.navigationButton}>
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
    console.log('url: ', url)

    const urlArr = url.split('/')
    const currentUrl = urlArr[urlArr.length - 1]
    return currentUrl
  }

  const currentView = determineView()
  console.log('currentView: ', currentView)

  return (
    <Stack className={styles.sidebarContainer}>
      <Stack horizontal className={styles.avatarContainer}>
        <Avatar color="colorful" name={name} />
      </Stack>
      <Stack className={styles.sidebarNavigationContainer}>
        <NavigationButton text={"Browse"} isActive={currentView === 'chat'} onClick={() => { navigate("/chat") }} />
        <NavigationButton text={"Generate"} isActive={currentView === 'generate'} onClick={() => { navigate("/generate") }} />
        <NavigationButton text={"Draft"} isActive={currentView === 'draft'} onClick={() => { navigate("/draft") }} />
      </Stack>
    </Stack>
  )
}

export default Sidebar
