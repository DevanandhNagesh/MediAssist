import { useForm } from 'react-hook-form';
import { Button, Form, Row, Col } from 'react-bootstrap';

const SymptomForm = ({ onSubmit, loading, availableSymptoms = [] }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      symptoms: '',
      age: '',
      gender: 'other',
      duration: ''
    }
  });

  const handleFormSubmit = (formData) => {
    const parsedSymptoms = formData.symptoms
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    onSubmit({
      symptoms: parsedSymptoms,
      age: formData.age ? Number(formData.age) : undefined,
      gender: formData.gender,
      duration: formData.duration ? Number(formData.duration) : undefined
    });
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Form onSubmit={handleSubmit(handleFormSubmit)} className="symptom-form">
      <Form.Group className="mb-3">
        <Form.Label>List your symptoms</Form.Label>
        <Form.Control
          placeholder="e.g. fever, cough, fatigue"
          {...register('symptoms', { required: true })}
        />
        {availableSymptoms.length > 0 && (
          <Form.Text className="text-muted">
            Suggested symptoms: {availableSymptoms.slice(0, 8).join(', ')}
          </Form.Text>
        )}
      </Form.Group>

      <Row className="g-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Age</Form.Label>
            <Form.Control type="number" min="0" max="120" {...register('age')} />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Gender</Form.Label>
            <Form.Select {...register('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Symptom duration (days)</Form.Label>
            <Form.Control type="number" min="0" max="365" {...register('duration')} />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex gap-2 mt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Symptoms'}
        </Button>
        <Button variant="outline-secondary" type="button" onClick={handleReset} disabled={loading}>
          Reset
        </Button>
      </div>
    </Form>
  );
};

export default SymptomForm;
