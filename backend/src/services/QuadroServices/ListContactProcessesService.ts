import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import QuadroGroup from "../../models/QuadroGroup";
import { Op } from "sequelize";

interface ProcessResponse {
  groupId: number;
  groupName: string;
  count: number;
}

const ListContactProcessesService = async (
  contactId: number,
  companyId: number
): Promise<ProcessResponse[]> => {
  const tickets = await Ticket.findAll({
    where: { contactId, companyId },
    attributes: ["id", "quadroGroupId"],
    include: [
      {
        model: TicketQuadro,
        as: "quadros",
        attributes: ["quadroGroupId", "sharedGroupIds"],
        required: false
      }
    ]
  });

  const groupCountMap: Record<number, number> = {};

  for (const ticket of tickets) {
    const quadro = ticket.quadros?.[0];
    const mainGroupId = ticket.quadroGroupId || quadro?.quadroGroupId || 1;
    groupCountMap[mainGroupId] = (groupCountMap[mainGroupId] || 0) + 1;

    const shared = quadro?.sharedGroupIds || [];
    for (const gId of shared) {
      groupCountMap[gId] = (groupCountMap[gId] || 0) + 1;
    }
  }

  const groupIds = Object.keys(groupCountMap).map(Number);

  if (groupIds.length === 0) {
    return [];
  }

  const groups = await QuadroGroup.findAll({
    where: { id: { [Op.in]: groupIds }, companyId },
    attributes: ["id", "name"]
  });

  const groupNameMap: Record<number, string> = {};
  for (const g of groups) {
    groupNameMap[g.id] = g.name;
  }

  const processes: ProcessResponse[] = Object.entries(groupCountMap).map(([gId, count]) => ({
    groupId: Number(gId),
    groupName: groupNameMap[Number(gId)] || "Kanban",
    count
  }));

  return processes;
};

export default ListContactProcessesService;
