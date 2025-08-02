import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started with Grid →
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - LLM Orchestration Framework`}
      description="Grid is a powerful TypeScript framework for building AI agents with tool-calling capabilities, observability, and production-ready features">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <section className="container margin-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <Heading as="h2" className="text--center margin-bottom--lg">
                Get Started in Seconds
              </Heading>
              <CodeBlock language="typescript">
{`import { createConfigurableAgent, calculatorTool } from "@mrck-labs/grid-core";

// Create an intelligent agent
const agent = createConfigurableAgent({
  config: {
    id: "math-tutor",
    type: "general",
    prompts: {
      system: "You are a helpful math tutor.",
    },
    tools: {
      custom: [calculatorTool],
    },
  },
});

// Use the agent
const response = await agent.act({ 
  messages: [{ role: "user", content: "What's 15% of 200?" }] 
});
console.log(response.content);
// "To calculate 15% of 200, I'll help you with that calculation..."
// "15% of 200 is 30"`}
              </CodeBlock>
              <div className="text--center margin-top--lg">
                <Link
                  className="button button--primary button--lg"
                  to="/docs/intro">
                  Start Building →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
