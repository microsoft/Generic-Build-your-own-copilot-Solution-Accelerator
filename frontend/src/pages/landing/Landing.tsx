import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react'
import { Stack } from '@fluentui/react'
import styles from './Landing.module.css'
import Contoso from '../../assets/Contoso.svg'
import { AppStateContext } from "../../state/AppProvider";
import CardExample from "../../components/FeatureCard/FeatureCard";
import { NewsRegular, NotepadRegular } from '@fluentui/react-icons'

const Landing = () => {
  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui

  return (
    <>
        <Stack className={styles.chatEmptyState}>
            <img src={ui?.chat_logo ? ui.chat_logo : Contoso} className={styles.chatIcon} aria-hidden="true" />
            <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title}</h1>
            <h2 className={styles.chatEmptyStateSubtitle}>{ui?.chat_description}</h2>

            <Stack
                horizontal
                className={styles.featureCardContainer}   
            >
                <CardExample 
                    icon={
                        <NewsRegular style={{
                            width: "48px",
                            height: "40px",
                        }} />
                    }
                    title="Browse"
                    description="Let AI search through your files and provide answers and summaries"
                    urlSuffix="/chat"
                />

                <CardExample 
                    icon={
                        <NotepadRegular style={{
                            width: "48px",
                            height: "40px",
                        }} />
                    }
                    title="Generate"
                    description="Have AI generate draft documents to save you time"
                    urlSuffix="/generate"
                />
            </Stack>
        </Stack>
    </>
  )
}

export default Landing
