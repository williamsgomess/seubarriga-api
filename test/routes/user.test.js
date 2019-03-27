const request = require('supertest');
const app = require('../../src/app');

const email = `${Date.now()}@gmail.com`;

test('Deve listar todos os usuários', () => request(app).get('/users')
  .then((res) => {
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  }));

test.skip('Deve inserir usuário com sucesso', () => request(app).post('/users')
  .send({ name: 'Williams Gomes', email, password: '123456' })
  .then((res) => {
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Williams Gomes');
  }));

test('Não deve inserir usuário sem nome', () => request(app).post('/users')
  .send({ email, password: '123456' })
  .then((res) => {
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Nome é um atributo obrigatório.');
  }));