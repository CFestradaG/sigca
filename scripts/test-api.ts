import { Repository, roundQ } from '../server/data/repository';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  FAILED: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' EJECUTANDO PRUEBAS AUTOMATIZADAS DE REGLAS DE NEGOCIO (RN-01 a RN-30)');
  console.log('====================================================\n');

  // Test 1: RN-28 - Monetary precision
  console.log('[Test 1] RN-28: Precisión monetaria de dos decimales');
  const sum1 = roundQ(0.1 + 0.2);
  assert(sum1 === 0.3, '0.1 + 0.2 redondeado a dos decimales es 0.3');
  const sum2 = roundQ(350.556);
  assert(sum2 === 350.56, '350.556 redondea a 350.56');

  // Test 2: RN-04 - Minor (< 18) must have a guardian
  console.log('\n[Test 2] RN-04: Pacientes menores de edad requieren responsable');
  // Create test minor patient with no guardian
  const minorNoGuardian = await Repository.createPatient({
    nombres: 'Niño',
    apellidos: 'Sin Tutor',
    fechaNacimiento: '2020-01-01', // ~6 years old
    responsableIds: [],
  });
  const valRN04 = Repository.validateAppointmentRules({
    pacienteId: minorNoGuardian!.id,
    servicioId: 'srv-1',
    profesionalId: 'usr-4',
    fecha: '2026-11-20',
    horaInicio: '10:00',
  });
  assert(!valRN04.valid && valRN04.code === 'RN-04', 'Bloquea programación para menor sin responsable registrado');

  // Test 3: RN-01 - No overlapping appointments
  console.log('\n[Test 3] RN-01: Traslape de citas para el mismo profesional');
  const latestAppointmentDate = Repository.getAppointments()
    .reduce((latest: string, appointment: any) => appointment.fecha > latest ? appointment.fecha : latest, '2000-01-01');
  const overlapDate = new Date(`${latestAppointmentDate}T12:00:00`);
  overlapDate.setDate(overlapDate.getDate() + 1);
  const activeDays = new Set(
    Repository.getSchedules()
      .filter((schedule: any) => schedule.activo)
      .map((schedule: any) => schedule.diaNumero),
  );
  while (!activeDays.has(overlapDate.getDay() || 7)) {
    overlapDate.setDate(overlapDate.getDate() + 1);
  }
  const overlapDateString = `${overlapDate.getFullYear()}-${String(overlapDate.getMonth() + 1).padStart(2, '0')}-${String(overlapDate.getDate()).padStart(2, '0')}`;
  await Repository.createAppointment({
    pacienteId: 'pac-1',
    servicioId: 'srv-1',
    profesionalId: 'usr-4',
    fecha: overlapDateString,
    horaInicio: '10:00',
  });

  const valOverlap = Repository.validateAppointmentRules({
    pacienteId: 'pac-1',
    servicioId: 'srv-1', // 45 min
    profesionalId: 'usr-4',
    fecha: overlapDateString,
    horaInicio: '10:15', // Overlaps with 10:00-10:45
  });
  assert(!valOverlap.valid && valOverlap.code === 'RN-01', 'Bloquea cita traslapada con intervalo ocupado (10:15 vs 10:00-10:45)');

  // Test 4: RN-02 - Respect schedule
  console.log('\n[Test 4] RN-02: Respeto a horarios de atención');
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + 1);
  while (nextSunday.getDay() !== 0) {
    nextSunday.setDate(nextSunday.getDate() + 1);
  }
  const sundayDate = `${nextSunday.getFullYear()}-${String(nextSunday.getMonth() + 1).padStart(2, '0')}-${String(nextSunday.getDate()).padStart(2, '0')}`;
  const valSunday = Repository.validateAppointmentRules({
    pacienteId: 'pac-1',
    servicioId: 'srv-1',
    profesionalId: 'usr-4',
    fecha: sundayDate,
    horaInicio: '10:00',
  });
  assert(!valSunday.valid && valSunday.code === 'RN-02', 'Bloquea cita en día inhábil / no activo (Domingo)');

  // Test 5: RN-12 - End time calculation
  console.log('\n[Test 5] RN-12: Cálculo automático de hora de finalización');
  const srv1 = Repository.getServiceById('srv-1'); // 45 mins
  const valRN12 = Repository.validateAppointmentRules({
    pacienteId: 'pac-1',
    servicioId: 'srv-1',
    profesionalId: 'usr-5',
    fecha: overlapDateString,
    horaInicio: '10:00',
  });
  assert(valRN12.calculatedHoraFin === '10:45', 'Hora de fin calculada como 10:45 para servicio de 45 min');

  // Test 6: RN-05 & RN-06 - State transitions
  console.log('\n[Test 6] RN-05 & RN-06: Transiciones de estado restringidas');
  let threwRN05 = false;
  try {
    await Repository.changeAppointmentStatus('cit-14', 'COMPLETADA'); // cit-14 is CANCELADA
  } catch (err: any) {
    threwRN05 = err.message.includes('RN-05');
  }
  assert(threwRN05, 'RN-05: Cita cancelada no puede pasar a COMPLETADA');

  let threwRN06 = false;
  try {
    await Repository.updateAppointment('cit-11', { horaInicio: '11:00' }); // cit-11 is COMPLETADA
  } catch (err: any) {
    threwRN06 = err.message.includes('RN-06');
  }
  assert(threwRN06, 'RN-06: Cita completada no puede reprogramarse');

  // Test 7: RN-16 - Payment amount > 0
  console.log('\n[Test 7] RN-16: Monto de pago mayor a cero');
  let threwRN16 = false;
  try {
    await Repository.registerPayment({
      citaId: 'cit-1',
      montoQ: 0,
      metodoPago: 'EFECTIVO',
      usuario: { id: 'usr-2', nombre: 'Recepción', rol: 'RECEPCION' },
    });
  } catch (e: any) {
    threwRN16 = e.message.includes('RN-16');
  }
  assert(threwRN16, 'RN-16: Rechaza pago con monto menor o igual a cero');

  // Test 8: RN-17 & RN-18 - Financial state and maximum payment check
  console.log('\n[Test 8] RN-17 & RN-18: Exceso de pago y balance automático');
  // cit-6 has precioQ = 350.0. pag-9 has paid 200.0. Remaining balance = 150.0
  const app6 = Repository.getAppointmentById('cit-6');
  assert(app6?.saldoPendienteQ === 150.0, 'cit-6 tiene saldo pendiente de Q150.00');
  assert(app6?.estadoFinanciero === 'PARCIAL', 'cit-6 tiene estado financiero PARCIAL');

  let threwRN17 = false;
  try {
    // Try to pay 200 when only 150 remains
    await Repository.registerPayment({
      citaId: 'cit-6',
      montoQ: 200,
      metodoPago: 'EFECTIVO',
      usuario: { id: 'usr-2', nombre: 'Recepción', rol: 'RECEPCION' },
    });
  } catch (e: any) {
    threwRN17 = e.message.includes('RN-17');
  }
  assert(threwRN17, 'RN-17: Rechaza pago superior al saldo pendiente restante');

  // Test 9: RN-22 - Single open cash register per user
  console.log('\n[Test 9] RN-22: Una sola caja abierta por usuario');
  let threwRN22 = false;
  try {
    // usr-2 already has caj-1 ABIERTA
    await Repository.openCashRegister('usr-2', 'María José Estrada', 100);
  } catch (e: any) {
    threwRN22 = e.message.includes('RN-22');
  }
  assert(threwRN22, 'RN-22: Impide abrir una segunda caja si el usuario ya tiene una abierta');

  // Test 10: RN-27 - Appointment with valid payments cannot be cancelled
  console.log('\n[Test 10] RN-27: Cita con pagos válidos no puede cancelarse');
  let threwRN27 = false;
  try {
    // cit-1 has valid payment pag-4
    await Repository.changeAppointmentStatus('cit-1', 'CANCELADA');
  } catch (e: any) {
    threwRN27 = e.message.includes('RN-27');
  }
  assert(threwRN27, 'RN-27: Bloquea cancelación directa de cita con pagos registrados activos');

  // Test 11: RN-09 - Material assignment to active patient only
  console.log('\n[Test 11] RN-09: Asignación de materiales solo a pacientes activos');
  // Deactivate patient pac-8
  await Repository.updatePatient('pac-8', { estado: 'INACTIVO' });
  let threwRN09 = false;
  try {
    await Repository.assignMaterialToPatient('mat-1', 'pac-8');
  } catch (e: any) {
    threwRN09 = e.message.includes('RN-09');
  }
  assert(threwRN09, 'RN-09: Impide asignar materiales educativos a pacientes inactivos');
  // Restore pac-8 to ACTIVO
  await Repository.updatePatient('pac-8', { estado: 'ACTIVO' });

  // Test 12: RF-11 - Cash discrepancy calculation on closure
  console.log('\n[Test 12] RF-11: Arqueo de caja y cálculo de diferencias');
  // caj-3 was closed with Q500 expected and Q490 counted -> difference -10
  const caj3 = Repository.getCashRegisterById('caj-3');
  assert(caj3?.diferenciaQ === -10.0, 'caj-3 registró faltante de Q-10.00 en arqueo de cierre');

  console.log('\n====================================================');
  console.log(` RESULTADOS FINALES: ${passed} PASADAS, ${failed} FALLADAS`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Error al ejecutar pruebas:', e);
  process.exit(1);
});
