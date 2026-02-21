import { PrismaClient, ManagerPosition, ManagerSkill, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const offices = [
        { name: 'Актау', address: '17-й микрорайон, БЦ Urban, зд. 22', lat: 43.635, lng: 51.168 },
        { name: 'Актобе', address: 'пр-т Алии Молдагуловой, 44', lat: 50.3, lng: 57.167 },
        { name: 'Алматы', address: 'пр-т Аль-Фараби, 77/7 БЦ Esentai Tower, 7 этаж', lat: 43.238, lng: 76.945 },
        { name: 'Астана', address: 'г. Астана, Есиль район, Достык 16, БЦ Talan Towers, 27 этаж', lat: 51.169, lng: 71.449 },
        { name: 'Атырау', address: 'ул. Студенческая 52, БЦ Адал, 2 этаж, 201 офис', lat: 47.106, lng: 51.916 },
        { name: 'Караганда', address: 'пр-т Нуркена Абдирова, ст 12 НП 3, 2 этаж', lat: 49.802, lng: 73.088 },
        { name: 'Павлодар', address: 'Павлодар, ул. Академика Сатпаева, 65', lat: 52.3, lng: 76.95 },
        { name: 'Уральск', address: 'пр-т Абая, 91/1', lat: 51.233, lng: 51.367 },
        { name: 'Усть-Каменогорск', address: 'ул. Максима Горького, 21', lat: 49.948, lng: 82.628 },
        { name: 'Шымкент', address: 'пр-т Тауке хана, 13', lat: 42.3, lng: 69.6 },
        { name: 'Кызылорда', address: 'ул. Жахаева, 15', lat: 44.85, lng: 65.5 },
        { name: 'Тараз', address: 'пр-т Абая, 123', lat: 42.9, lng: 71.36 },
        { name: 'Кокшетау', address: 'ул. Абая, 91', lat: 53.28, lng: 69.39 }
    ];

    const createdOffices = [];
    for (const office of offices) {
        const o = await prisma.office.create({
            data: {
                name: office.name,
                address: office.address,
                latitude: office.lat,
                longitude: office.lng
            }
        });
        createdOffices.push(o);
    }

    const managersData = [
        { name: 'Менеджер 1', position: ManagerPosition.LEAD_SPECIALIST, office: 'Караганда', skills: [ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 2', position: ManagerPosition.LEAD_SPECIALIST, office: 'Уральск', skills: [ManagerSkill.VIP, ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 3', position: ManagerPosition.SPECIALIST, office: 'Шымкент', skills: [ManagerSkill.KZ] },
        { name: 'Менеджер 4', position: ManagerPosition.SPECIALIST, office: 'Кызылорда', skills: [ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 5', position: ManagerPosition.SPECIALIST, office: 'Астана', skills: [ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 6', position: ManagerPosition.LEAD_SPECIALIST, office: 'Павлодар', skills: [ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 7', position: ManagerPosition.LEAD_SPECIALIST, office: 'Тараз', skills: [ManagerSkill.VIP, ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 8', position: ManagerPosition.LEAD_SPECIALIST, office: 'Усть-Каменогорск', skills: [ManagerSkill.ENG, ManagerSkill.KZ] },
        { name: 'Менеджер 9', position: ManagerPosition.SPECIALIST, office: 'Павлодар', skills: [ManagerSkill.KZ] },
        { name: 'Менеджер 10', position: ManagerPosition.LEAD_SPECIALIST, office: 'Алматы', skills: [ManagerSkill.VIP] }
    ];

    for (const m of managersData) {
        const office = createdOffices.find(o => o.name === m.office);
        if (office) {
            await prisma.manager.create({
                data: {
                    fullName: m.name,
                    position: m.position,
                    userRole: UserRole.MANAGER,
                    officeId: office.id,
                    skills: m.skills
                }
            });
        }
    }

    console.log('Seed completed!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
