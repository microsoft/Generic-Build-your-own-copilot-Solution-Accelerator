import * as React from "react";
import {
  makeStyles,
  tokens,
  Text,
  CardHeader,
} from "@fluentui/react-components";
import { Stack } from '@fluentui/react';
import { useNavigate } from "react-router-dom";


const useStyles = makeStyles({
  card: {
    width: "256px",
    height: "190px",
    maxWidth: "100%",
    borderRadius: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: "0px 0px 2px 0px #0000001F, 0px 4px 8px 0px #00000024",
    border: "1px solid #0000001F",
    padding: "16px",

    // hover effect
    "&:hover": {
      boxShadow: "0px 0px 0px 0px #0000001F",
      border: "1px solid #0000001F",
      cursor: "pointer",
    },
  },

  title: {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 600,
    margin: "0",
  },

  text: { 
    margin: "0",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    textAlign: "left",
  },
});

interface FeatureCardProps {
  icon: React.ReactNode; // Assuming icon is a React node
  title: string;
  description: string; // Explicitly defining the type for description
  urlSuffix: string;
}

const FeatureCard = ({ icon, title, description, urlSuffix }: FeatureCardProps) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const onClick = () => { navigate(urlSuffix); }

  return (
    <div
      className={styles.card}
      onClick={onClick}
    >
      <CardHeader
        header={
        <Stack>
          {icon}
          <Text className={styles.title}>{title}</Text>
        </Stack>
        }
      />

      <p className={styles.text}>
        {description}
      </p>
    </div>
  );
};

export default FeatureCard