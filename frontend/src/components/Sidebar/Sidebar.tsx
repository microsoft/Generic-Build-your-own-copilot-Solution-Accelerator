import React, { useEffect, useState, useContext } from 'react'
import { Stack, Text } from '@fluentui/react'
import { Book28Regular, Book32Regular, BookRegular, News28Regular, NewsRegular, Notepad28Regular, Notepad32Regular } from '@fluentui/react-icons'
import { Button, Avatar } from '@fluentui/react-components'
import styles from './Sidebar.module.css'
import { AppStateContext } from '../../state/AppProvider'
import { getUserInfo } from '../../api'
import { useNavigate } from 'react-router-dom'

interface NavigationButtonProps {
  text: string
  icon: JSX.Element
  onClick: () => void
}

const NavigationButton = ({ text, icon, onClick }: NavigationButtonProps) => {
  return (
    <Stack
      onClick={onClick}
      className={styles.navigationButton}
    >
      <Button
          appearance="transparent"
          size="large"
          icon={icon}
          style={{ padding: '0' }}
      />
      <p>{text}</p>
    </Stack>
  )
}

const Sidebar = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)
  const navigate = useNavigate()
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

  return (
    <Stack className={styles.sidebarContainer}>
      <Stack horizontal className={styles.avatarContainer}>
        <Avatar color="colorful" name={name} />
      </Stack>
      <Stack className={styles.sidebarNavigationContainer}>
        <NavigationButton text={"Browse"} icon={<News28Regular color="#0078D4" />} onClick={() => { navigate("/chat") }} />
        <NavigationButton text={"Generate"} icon={<Book28Regular color="#0078D4" />} onClick={() => { navigate("/generate") }} />
        <NavigationButton text={"Draft"} icon={<Notepad28Regular color="#0078D4" />} onClick={() => { navigate("/draft") }} />
      </Stack>
    </Stack>
  )
}

export default Sidebar
