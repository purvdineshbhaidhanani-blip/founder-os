import { Router, Request, Response } from 'express';
import { ResearchRunner } from '../../opportunity/research/research-runner.js';
import { SessionPersistence } from '../../opportunity/research/session-persistence.js';
import { OpportunityStore } from '../../opportunity/opportunity-store.js';

const router = Router();

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { period = '30d', sources, limit } = req.body;

    const store = new OpportunityStore();
    const runner = new ResearchRunner(store);

    const config = {
      preset: period as any,
      limitPerSource: limit,
      enabledSources: sources,
    };

    const result = await runner.runFull(config);

    res.json({
      status: 'complete',
      session: result.session,
      analysis: result.analysis,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const persistence = new SessionPersistence();
    const sessions = persistence.listSessions();
    const champion = persistence.getChampion();

    const latest = sessions[0];

    res.json({
      totalSessions: sessions.length,
      champion,
      latestSession: latest,
      recentSessions: sessions.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const persistence = new SessionPersistence();
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const sessions = persistence.listSessions().slice(0, limit);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    const persistence = new SessionPersistence();
    const session = persistence.load(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    const persistence = new SessionPersistence();
    const results = persistence.search(query, { maxResults: 20 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
