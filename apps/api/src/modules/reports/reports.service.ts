import { toCsv } from '../../lib/csv.js';
import { financeService } from '../finance/finance.service.js';
import { reportsRepository } from './reports.repository.js';

export class ReportsService {
  async getReport(
    report: string,
    input: { branchId?: string; dateFrom?: Date; dateTo?: Date; status?: string },
  ) {
    switch (report) {
      case 'clients-status': {
        const clients = await reportsRepository.clientsByStatus(input.branchId, input.status);
        return {
          report,
          data: clients,
          summary: clients.reduce<Record<string, number>>((acc, client) => {
            acc[client.status] = (acc[client.status] ?? 0) + 1;
            return acc;
          }, {}),
        };
      }
      case 'memberships-expiring': {
        const memberships = await reportsRepository.membershipsExpiring(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: memberships,
          summary: {
            total: memberships.length,
          },
        };
      }
      case 'income': {
        const payments = await reportsRepository.payments(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: payments,
          summary: {
            totalAmount: payments.reduce((sum, payment) => sum + Number(payment.finalAmount), 0),
            totalRecords: payments.length,
          },
        };
      }
      case 'expenses': {
        const expenses = await reportsRepository.expenses(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: expenses,
          summary: {
            totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
            totalRecords: expenses.length,
          },
        };
      }
      case 'balance': {
        return {
          report,
          data: [],
          summary: await financeService.summary(input),
        };
      }
      case 'accesses': {
        const accesses = await reportsRepository.accesses(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: accesses,
          summary: accesses.reduce(
            (acc, access) => {
              if (access.result === 'ALLOWED') {
                acc.allowed += 1;
              } else {
                acc.denied += 1;
              }
              return acc;
            },
            { allowed: 0, denied: 0 },
          ),
        };
      }
      case 'top-plans': {
        const grouped = await reportsRepository.topPlans(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: grouped,
          summary: {
            totalPlans: grouped.length,
          },
        };
      }
      case 'payment-methods': {
        const grouped = await reportsRepository.paymentMethods(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: grouped,
          summary: {
            totalMethods: grouped.length,
          },
        };
      }
      case 'class-attendance': {
        const schedules = await reportsRepository.classAttendance(input.branchId, input.dateFrom, input.dateTo);
        return {
          report,
          data: schedules,
          summary: {
            totalSchedules: schedules.length,
            attended: schedules.reduce(
              (sum, schedule) => sum + schedule.enrollments.filter((enrollment) => enrollment.status === 'ATTENDED').length,
              0,
            ),
          },
        };
      }
      case 'low-stock': {
        const products = (await reportsRepository.lowStock(input.branchId)).filter((product) => product.stock <= product.minStock);
        return {
          report,
          data: products,
          summary: {
            totalProducts: products.length,
          },
        };
      }
      default:
        return {
          report,
          data: [],
          summary: {},
        };
    }
  }

  async exportCsv(report: string, input: { branchId?: string; dateFrom?: Date; dateTo?: Date; status?: string }) {
    const reportResult = await this.getReport(report, input);
    const rows = this.toCsvRows(report, reportResult.data, reportResult.summary);
    return toCsv(rows);
  }

  private toCsvRows(report: string, data: any[], summary: any) {
    switch (report) {
      case 'clients-status':
        return data.map((client) => ({
          socio: client.memberNumber,
          nombre: `${client.firstName} ${client.lastName}`,
          dni: client.dni,
          estado: client.status,
          sucursal: client.branch?.name ?? '',
          ultimoPlan: client.memberships[0]?.plan?.name ?? '',
          vence: client.memberships[0]?.endsAt?.toISOString?.() ?? '',
        }));
      case 'memberships-expiring':
        return data.map((membership) => ({
          socio: membership.client.memberNumber,
          cliente: `${membership.client.firstName} ${membership.client.lastName}`,
          plan: membership.plan.name,
          sucursal: membership.branch.name,
          vence: membership.endsAt.toISOString(),
        }));
      case 'income':
        return data.map((payment) => ({
          fecha: payment.paidAt.toISOString(),
          concepto: payment.concept,
          cliente: payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : '',
          metodo: payment.method,
          sucursal: payment.branch.name,
          monto: Number(payment.finalAmount),
          recibo: payment.receiptNumber ?? '',
        }));
      case 'expenses':
        return data.map((expense) => ({
          fecha: expense.expenseDate.toISOString(),
          descripcion: expense.description,
          categoria: expense.category.parent?.name ?? expense.category.name,
          subcategoria: expense.category.parent ? expense.category.name : expense.subcategory ?? '',
          sucursal: expense.branch.name,
          metodo: expense.method,
          monto: Number(expense.amount),
        }));
      case 'balance':
        return [
          {
            ingresos: summary.totals.income,
            gastos: summary.totals.expenses,
            balanceNeto: summary.totals.net,
            morosos: summary.totals.overdueReceivables,
          },
        ];
      case 'accesses':
        return data.map((access) => ({
          fecha: access.attemptedAt.toISOString(),
          cliente: access.client ? `${access.client.firstName} ${access.client.lastName}` : '',
          sucursal: access.branch.name,
          dispositivo: access.device?.name ?? '',
          resultado: access.result,
          motivo: access.denialReason ?? '',
        }));
      case 'top-plans':
        return data.map((item) => ({
          planId: item.planId,
          cantidad: item._count.id,
          montoPactado: Number(item._sum.agreedAmount ?? 0),
        }));
      case 'payment-methods':
        return data.map((item) => ({
          metodo: item.method,
          cantidad: item._count.id,
          total: Number(item._sum.finalAmount ?? 0),
        }));
      case 'class-attendance':
        return data.map((schedule) => ({
          actividad: schedule.activity.name,
          sucursal: schedule.branch.name,
          inicio: schedule.startsAt.toISOString(),
          instructor: schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : '',
          inscriptos: schedule.enrollments.length,
          asistieron: schedule.enrollments.filter((enrollment: any) => enrollment.status === 'ATTENDED').length,
          ausentes: schedule.enrollments.filter((enrollment: any) => enrollment.status === 'NO_SHOW').length,
          estado: schedule.status,
        }));
      case 'low-stock':
        return data.map((product) => ({
          codigo: product.code,
          producto: product.name,
          categoria: product.category.name,
          sucursal: product.branch?.name ?? '',
          stock: product.stock,
          stockMinimo: product.minStock,
        }));
      default:
        return [];
    }
  }
}

export const reportsService = new ReportsService();
