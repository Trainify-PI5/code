import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { it, expect, vi } from 'vitest';
import api from '../services/api';
import CourseAssessment from './CourseAssessment';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../contexts/LanguageContext', () => {
  const t = (key: string) => key;
  return { useLanguage: () => ({ t }) };
});

function abrir() {
  render(<MemoryRouter initialEntries={['/prova/a']}><Routes><Route path="/prova/:lessonId"
    element={<CourseAssessment onBack={() => {}} />} /></Routes></MemoryRouter>);
}

const quiz = { title: 'Etiquetas', passingScore: 70, maxAttempts: 1, attemptsUsed: 0, attemptsRemaining: 1,
  questions: [{ id: 'p', text: 'Qual cor?', options: [{ id: 'az', text: 'Azul' }, { id: 'am', text: 'Amarela' }] }] };

it('recupera a avaliação após uma falha de rede e envia somente a alternativa escolhida', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce({ data: quiz });
  vi.mocked(api.post).mockResolvedValueOnce({ data: { passed: true, correctAnswers: 1, totalQuestions: 1,
    passingScore: 70, score: 100, attemptNumber: 1, maxAttempts: 1, attemptsRemaining: 0, questions: [] } });
  const user = userEvent.setup();
  abrir();
  expect(await screen.findByRole('alert')).toHaveTextContent('assessment.loadError');
  await user.click(screen.getByText('assessment.tryAgain'));
  await user.click(await screen.findByText('assessment.start'));
  const enviar = screen.getByText('assessment.submit');
  expect(enviar).toBeDisabled();
  await user.click(screen.getByText('Azul'));
  await user.click(enviar);
  expect(await screen.findByText('assessment.approved')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/assessments/lessons/a/submit', { answers: { p: 'az' } });
});

it('preserva a tela de avaliação não configurada em caso de 404', async () => {
  vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 404 } });
  abrir();
  expect(await screen.findByText('assessment.notConfigured')).toBeInTheDocument();
});
