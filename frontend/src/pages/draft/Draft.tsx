import styles from './Draft.module.css'
import { useLocation } from 'react-router-dom';
import TitleCard from '../../components/DraftCards/TitleCard'
import SectionCard from '../../components/DraftCards/SectionCard'
import { DraftedDocument } from '../../api'

const Draft = (): JSX.Element => {

  const location = useLocation();
  const { parameter } = location.state as { parameter: DraftedDocument };
  
  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'start', alignItems: 'center' }}>
        <h4>Draft Document</h4>
      </div>

      <TitleCard />
      
      {(parameter?.sections ?? []).map((_, index) => (
          <SectionCard key={index} section={_} />
      ))}
    </div>
  )
}

export default Draft
