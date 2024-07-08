import styles from './Draft.module.css'
import { useContext } from 'react'
import { AppStateContext } from '../../state/AppProvider'
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'


const Draft = (): JSX.Element => {
  const appStateContext = useContext(AppStateContext)

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'center' }}>
        <h4>Draft Document</h4>
      </div>

      <TitleCard />
      
      {(appStateContext?.state.draftedDocument.sections ?? []).map((_, index) => (
          <SectionCard key={index} sectionIdx={index} />
      ))}
    </div>
  )
}

export default Draft
