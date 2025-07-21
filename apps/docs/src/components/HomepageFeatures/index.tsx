import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

// We'll use emojis instead of SVGs for a cleaner look
type GridFeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const GridFeatureList: GridFeatureItem[] = [
  {
    title: 'AI-Powered Agents',
    emoji: '🤖',
    description: (
      <>
        Build intelligent agents with TypeScript. Grid provides a comprehensive
        framework for creating conversational AI with tool-calling capabilities
        and complex workflows.
      </>
    ),
  },
  {
    title: 'Powerful Tool System',
    emoji: '🔧',
    description: (
      <>
        Extend your agents with custom tools using Zod schemas. Seamlessly
        integrate with external APIs, databases, and services. Full MCP support
        included.
      </>
    ),
  },
  {
    title: 'Built-in Observability',
    emoji: '📊',
    description: (
      <>
        Monitor everything with Langfuse integration. Track costs, performance,
        errors, and user interactions. Session-based tracing with automatic
        cost calculation.
      </>
    ),
  },
  {
    title: 'Layered Architecture',
    emoji: '🏗️',
    description: (
      <>
        From atomic services to complex orchestration. Build on a solid
        foundation with our closure-based functional architecture and
        composition patterns.
      </>
    ),
  },
  {
    title: 'Production Ready',
    emoji: '🚀',
    description: (
      <>
        Error handling, retries, streaming, and progress tracking built-in.
        Deploy with confidence using battle-tested patterns and comprehensive
        error boundaries.
      </>
    ),
  },
  {
    title: 'Developer Experience',
    emoji: '💡',
    description: (
      <>
        TypeScript-first with excellent type inference. Comprehensive docs,
        examples, and a growing community. Works with your favorite tools
        and frameworks.
      </>
    ),
  },
];

// Keep the old FeatureList for compatibility but unused
const FeatureList: FeatureItem[] = [];

function GridFeature({title, emoji, description}: GridFeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        {emoji}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row" style={{ marginBottom: '2rem' }}>
          {GridFeatureList.slice(0, 3).map((props, idx) => (
            <GridFeature key={idx} {...props} />
          ))}
        </div>
        <div className="row">
          {GridFeatureList.slice(3, 6).map((props, idx) => (
            <GridFeature key={idx + 3} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
